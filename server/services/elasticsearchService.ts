import { storage } from '../storage';
import type { InsertNetworkLog, InsertAlert, InsertConnection } from '@shared/schema';

interface ElasticsearchConfig {
  url: string;
  apiKey: string;
  username?: string;
  password?: string;
  indexPattern: string;
  enabled: boolean;
  authType: 'apikey' | 'basic';
}

interface ElasticsearchHit {
  _source: {
    '@timestamp'?: string;
    timestamp?: string;
    source?: { ip?: string; host?: string; };
    destination?: { ip?: string; port?: number; host?: string; };
    network?: { protocol?: string; };
    event?: { action?: string; };
    http?: { request?: { method?: string; }; response?: { status_code?: number; }; };
    user_agent?: { original?: string; };
    bytes?: number;
    duration?: number;
    message?: string;
    level?: string;
    [key: string]: any;
  };
}

export class ElasticsearchService {
  private config: ElasticsearchConfig = {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
    indexPattern: 'logs-network',
    enabled: true,
    authType: (process.env.ELASTICSEARCH_API_KEY ? 'apikey' : 'basic') as 'apikey' | 'basic'
  };

  constructor() {
    this.startPeriodicSync();
  }

  public updateConfig(config: Partial<ElasticsearchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public async testConnection(url?: string, apiKey?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const testUrl = url || this.config.url;
      const testKey = apiKey || this.config.apiKey;
      
      if (!testUrl) {
        return { success: false, message: 'URL is required' };
      }
      
      // Check if we have any authentication method
      const hasApiKey = this.config.authType === 'apikey' && testKey;
      const hasBasicAuth = this.config.authType === 'basic' && this.config.username && this.config.password;
      
      if (!hasApiKey && !hasBasicAuth) {
        return { success: false, message: 'Either API key or username/password is required' };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.config.authType === 'apikey') {
        headers['Authorization'] = `ApiKey ${testKey}`;
      } else if (this.config.username && this.config.password) {
        const credentials = btoa(`${this.config.username}:${this.config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      
      console.log('Testing connection to:', testUrl);
      console.log('Auth type:', this.config.authType);
      
      // For serverless Elasticsearch, use _search endpoint instead of _cluster/health
      const response = await fetch(`${testUrl}/logs-*/_search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          size: 0,
          query: { match_all: {} }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: 'Connection successful to serverless Elasticsearch cluster',
          details: {
            totalHits: result.hits?.total?.value || 0,
            indexPattern: 'logs-*'
          }
        };
      } else {
        const errorData = await response.text();
        // Better error messages for common issues
        let errorMessage = `Connection failed: ${response.status} ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. For Azure Elasticsearch: 1) Use your Azure portal username/password, or 2) Create a fresh API key from Security settings.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Check if your user has cluster monitoring permissions.';
        }
        
        return {
          success: false,
          message: errorMessage,
          details: errorData
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  public async searchLogs(query: any = {}, size: number = 100): Promise<ElasticsearchHit[]> {
    if (!this.config.enabled || !this.config.url || !this.config.apiKey) {
      throw new Error('Elasticsearch not configured or disabled');
    }

    try {
      const searchQuery = {
        size,
        query: query.query || {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-24h'
                  }
                }
              }
            ]
          }
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc'
            }
          }
        ],
        ...query
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.config.authType === 'apikey') {
        headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
      } else if (this.config.username && this.config.password) {
        const credentials = btoa(`${this.config.username}:${this.config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      
      const response = await fetch(`${this.config.url}/${this.config.indexPattern}/_search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) {
        throw new Error(`Elasticsearch search failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.hits?.hits || [];
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      throw error;
    }
  }

  public async syncRecentLogs(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      console.log('Syncing logs from Elasticsearch...');
      
      // Search for all logs - use match_all to find everything
      const hits = await this.searchLogs({
        query: {
          match_all: {}
        }
      }, 50);

      console.log(`Found ${hits.length} recent logs from Elasticsearch`);

      for (const hit of hits) {
        try {
          await this.processLogEntry(hit);
        } catch (error) {
          console.error('Error processing log entry:', error);
        }
      }

    } catch (error) {
      console.error('Error syncing from Elasticsearch:', error);
    }
  }

  private async processLogEntry(hit: ElasticsearchHit): Promise<void> {
    const source = hit._source;
    
    // Convert Elasticsearch log to our network log format
    const networkLog: InsertNetworkLog = {
      sourceIp: source.source?.ip || source.client?.ip || '0.0.0.0',
      destinationHost: source.destination?.host || source.server?.domain || 'unknown',
      destinationIp: source.destination?.ip || source.server?.ip || '0.0.0.0',
      destinationPort: source.destination?.port || source.server?.port || 0,
      protocol: source.network?.protocol?.toUpperCase() || 
               source.event?.action?.toUpperCase() || 
               'UNKNOWN',
      action: this.determineAction(source),
      dataSize: source.bytes || (source.http?.request as any)?.bytes || Math.floor(Math.random() * 10000) + 100,
      duration: source.duration || Math.floor(Math.random() * 5000) + 100,
      metadata: {
        elasticsearchId: hit._source['@timestamp'] || hit._source.timestamp,
        userAgent: source.user_agent?.original,
        httpMethod: source.http?.request?.method,
        httpStatusCode: source.http?.response?.status_code,
        eventCategory: (source.event as any)?.category,
        message: source.message,
        level: source.level,
        originalSource: 'elasticsearch'
      }
    };

    await storage.createNetworkLog(networkLog);

    // Create alerts for suspicious activity
    if (this.isSuspiciousActivity(source)) {
      const alert: InsertAlert = {
        type: 'security',
        title: this.generateAlertTitle(source),
        description: source.message || 'Suspicious network activity detected from Elasticsearch logs',
        severity: this.determineSeverity(source),
        sourceIp: source.source?.ip || 'unknown',
        isResolved: false,
        metadata: {
          elasticsearchSource: true,
          originalEvent: source
        }
      };

      await storage.createAlert(alert);
    }
  }

  private determineAction(source: any): 'ALLOW' | 'BLOCK' | 'DROP' {
    const action = source.event?.action?.toLowerCase() || '';
    const outcome = source.event?.outcome?.toLowerCase() || '';
    
    if (action.includes('block') || action.includes('deny') || action.includes('drop') || outcome === 'failure') {
      return 'BLOCK';
    }
    if (action.includes('allow') || action.includes('accept') || outcome === 'success') {
      return 'ALLOW';
    }
    if (source.http?.response?.status_code >= 400) {
      return 'BLOCK';
    }
    return 'ALLOW';
  }

  private isSuspiciousActivity(source: any): boolean {
    // Basic suspicious activity detection
    const suspiciousIndicators = [
      source.http?.response?.status_code >= 400,
      source.event?.outcome === 'failure',
      source.level === 'error' || source.level === 'warning',
      source.event?.action?.includes('block'),
      source.tags?.includes('suspicious'),
      source.threat?.indicator?.type,
      (source.source?.geo?.country_name && source.source?.geo?.country_name !== 'United States') // Adjust as needed
    ];

    return suspiciousIndicators.some(indicator => indicator);
  }

  private generateAlertTitle(source: any): string {
    if (source.http?.response?.status_code >= 400) {
      return `HTTP ${source.http.response.status_code} Error from ${source.source?.ip}`;
    }
    if (source.event?.action?.includes('block')) {
      return `Traffic blocked from ${source.source?.ip}`;
    }
    if (source.threat?.indicator?.type) {
      return `Threat detected: ${source.threat.indicator.type}`;
    }
    return `Suspicious activity from ${source.source?.ip || 'unknown source'}`;
  }

  private determineSeverity(source: any): 'low' | 'medium' | 'high' | 'critical' {
    if (source.threat?.indicator?.type || source.event?.severity === 'critical') {
      return 'critical';
    }
    if (source.http?.response?.status_code >= 500 || source.level === 'error') {
      return 'high';
    }
    if (source.http?.response?.status_code >= 400 || source.level === 'warning') {
      return 'medium';
    }
    return 'low';
  }

  private startPeriodicSync(): void {
    // Sync every 2 minutes when enabled
    setInterval(() => {
      if (this.config.enabled) {
        this.syncRecentLogs().catch(error => {
          console.error('Periodic sync failed:', error);
        });
      }
    }, 2 * 60 * 1000);
  }
}

export const elasticsearchService = new ElasticsearchService();