import { EventEmitter } from 'events';
import { storage } from '../storage';
import type { InsertNetworkLog, InsertAlert, InsertTrafficMetric } from '@shared/schema';

class NetworkMonitor extends EventEmitter {
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Network monitor started');

    // Start monitoring processes
    this.startTrafficCollection();
    this.startAnomalyDetection();
    this.startMetricsAggregation();
  }

  stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('Network monitor stopped');
  }

  private startTrafficCollection() {
    // In a real implementation, this would interface with system network monitoring
    // For now, we'll simulate network traffic data collection
    setInterval(() => {
      if (!this.isRunning) return;
      this.simulateNetworkTraffic();
    }, 5000); // Collect data every 5 seconds
  }

  private startAnomalyDetection() {
    setInterval(() => {
      if (!this.isRunning) return;
      this.detectAnomalies();
    }, 30000); // Check for anomalies every 30 seconds
  }

  private startMetricsAggregation() {
    setInterval(() => {
      if (!this.isRunning) return;
      this.aggregateMetrics();
    }, 60000); // Aggregate metrics every minute
  }

  private async simulateNetworkTraffic() {
    // Enhanced data collection with more realistic network activity
    // In production, this would interface with actual network monitoring tools
    
    const protocols = ['HTTPS', 'HTTP', 'DNS', 'TCP', 'UDP', 'ICMP'];
    const actions = ['ALLOW', 'BLOCK', 'DENY'];
    
    // Real-world destinations with realistic traffic patterns
    const commonHosts = [
      'google.com', 'github.com', 'stackoverflow.com', 'microsoft.com',
      'cloudflare.com', 'amazonaws.com', 'facebook.com', 'twitter.com',
      'linkedin.com', 'youtube.com', 'reddit.com', 'wikipedia.org',
      'apple.com', 'mozilla.org', 'adobe.com', 'dropbox.com',
      'slack.com', 'discord.com', 'zoom.us', 'office365.com'
    ];
    
    const suspiciousHosts = [
      'suspicious-tracking.net', 'malware-distribution.org', 'phishing-attempt.com',
      'crypto-miner.xyz', 'data-harvester.info', 'fake-banking.net'
    ];
    
    // Add corporate and development hosts
    const corporateHosts = [
      'corporate-intranet.local', 'fileserver.local', 'email.company.com',
      'vpn.company.com', 'backup.company.com', 'monitoring.company.com'
    ];

    // Generate varied traffic patterns based on time of day
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 9 && currentHour <= 17;
    const trafficMultiplier = isBusinessHours ? 3 : 1;
    
    // Generate normal traffic with realistic patterns
    for (let i = 0; i < Math.floor(Math.random() * 5 * trafficMultiplier) + 1; i++) {
      const isHTTPS = Math.random() > 0.3;
      const allHosts = [...commonHosts, ...(isBusinessHours ? corporateHosts : [])];
      
      const log: InsertNetworkLog = {
        sourceIp: this.generateRealisticIP(),
        destinationHost: allHosts[Math.floor(Math.random() * allHosts.length)],
        destinationIp: this.generatePublicIP(),
        destinationPort: isHTTPS ? 443 : (Math.random() > 0.8 ? 80 : Math.floor(Math.random() * 65535)),
        protocol: isHTTPS ? 'HTTPS' : protocols[Math.floor(Math.random() * protocols.length)],
        action: 'ALLOW',
        dataSize: this.generateRealisticDataSize(),
        duration: Math.floor(Math.random() * 3000) + 50,
        metadata: {
          userAgent: this.getRandomUserAgent(),
          method: isHTTPS ? 'GET' : undefined,
          responseCode: Math.random() > 0.95 ? 404 : 200
        }
      };

      try {
        const savedLog = await storage.createNetworkLog(log);
        this.emit('networkLog', savedLog);
      } catch (error) {
        console.error('Failed to save network log:', error);
      }
    }

    // Occasionally generate suspicious traffic
    if (Math.random() > 0.9) {
      const suspiciousLog: InsertNetworkLog = {
        sourceIp: this.generateRandomIP(),
        destinationHost: suspiciousHosts[Math.floor(Math.random() * suspiciousHosts.length)],
        destinationIp: this.generateRandomIP(),
        destinationPort: Math.floor(Math.random() * 65535),
        protocol: 'HTTP',
        action: 'BLOCK',
        dataSize: Math.floor(Math.random() * 1000),
        duration: Math.floor(Math.random() * 1000),
        metadata: {
          reason: 'Suspicious domain detected',
          threat_level: 'high'
        }
      };

      try {
        const savedLog = await storage.createNetworkLog(suspiciousLog);
        this.emit('networkLog', savedLog);

        // Create corresponding alert
        const alert: InsertAlert = {
          severity: 'HIGH',
          type: 'SUSPICIOUS_TRAFFIC',
          title: 'Suspicious Traffic Detected',
          description: `Blocked connection to suspicious domain: ${suspiciousLog.destinationHost}`,
          sourceIp: suspiciousLog.sourceIp,
          metadata: {
            blockedHost: suspiciousLog.destinationHost,
            logId: savedLog.id
          }
        };

        const savedAlert = await storage.createAlert(alert);
        this.emit('alert', savedAlert);
      } catch (error) {
        console.error('Failed to save suspicious log/alert:', error);
      }
    }
  }

  private async detectAnomalies() {
    try {
      // Get recent logs for analysis
      const recentLogs = await storage.getNetworkLogsByTimeRange(
        new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        new Date()
      );

      // Check for rapid connection attempts from same IP
      const ipCounts: { [key: string]: number } = {};
      recentLogs.forEach(log => {
        ipCounts[log.sourceIp] = (ipCounts[log.sourceIp] || 0) + 1;
      });

      for (const [ip, count] of Object.entries(ipCounts)) {
        if (count > 20) { // More than 20 connections in 5 minutes
          const alert: InsertAlert = {
            severity: 'MEDIUM',
            type: 'RAPID_CONNECTIONS',
            title: 'Rapid Connection Pattern Detected',
            description: `IP ${ip} made ${count} connections in the last 5 minutes`,
            sourceIp: ip,
            metadata: {
              connectionCount: count,
              timeWindow: '5 minutes'
            }
          };

          const savedAlert = await storage.createAlert(alert);
          this.emit('alert', savedAlert);
        }
      }

      // Check for unusual data volume
      const totalData = recentLogs.reduce((sum, log) => sum + (log.dataSize || 0), 0);
      if (totalData > 100 * 1024 * 1024) { // More than 100MB in 5 minutes
        const alert: InsertAlert = {
          severity: 'MEDIUM',
          type: 'HIGH_BANDWIDTH',
          title: 'High Bandwidth Usage Detected',
          description: `${(totalData / (1024 * 1024)).toFixed(2)} MB transferred in the last 5 minutes`,
          metadata: {
            dataVolume: totalData,
            timeWindow: '5 minutes'
          }
        };

        const savedAlert = await storage.createAlert(alert);
        this.emit('alert', savedAlert);
      }
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    }
  }

  private async aggregateMetrics() {
    try {
      // Get recent data for aggregation
      const recentLogs = await storage.getNetworkLogsByTimeRange(
        new Date(Date.now() - 60 * 60 * 1000), // Last hour
        new Date()
      );

      const activeConnections = await storage.getActiveConnections();
      const blockedRequests = recentLogs.filter(log => log.action === 'BLOCK').length;
      const totalTraffic = recentLogs.reduce((sum, log) => sum + (log.dataSize || 0), 0);

      // Calculate protocol distribution
      const protocolCounts: { [key: string]: number } = {};
      recentLogs.forEach(log => {
        protocolCounts[log.protocol] = (protocolCounts[log.protocol] || 0) + 1;
      });

      // Calculate top destinations
      const destinationCounts: { [key: string]: number } = {};
      recentLogs.forEach(log => {
        if (log.destinationHost) {
          destinationCounts[log.destinationHost] = (destinationCounts[log.destinationHost] || 0) + 1;
        }
      });

      const metrics: InsertTrafficMetric = {
        totalTraffic: totalTraffic.toString(),
        activeConnections: activeConnections.length,
        blockedRequests,
        protocolDistribution: protocolCounts,
        topDestinations: destinationCounts
      };

      const savedMetrics = await storage.createTrafficMetric(metrics);
      this.emit('metricsUpdate', savedMetrics);
    } catch (error) {
      console.error('Failed to aggregate metrics:', error);
    }
  }

  private generateRandomIP(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private generateRealisticIP(): string {
    // Generate realistic internal IP ranges
    const ranges = [
      () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      () => `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    ];
    return ranges[Math.floor(Math.random() * ranges.length)]();
  }

  private generatePublicIP(): string {
    // Generate realistic public IP ranges (avoiding private ranges)
    const publicRanges = [
      () => `8.8.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, // Google DNS range
      () => `1.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, // Cloudflare
      () => `${74 + Math.floor(Math.random() * 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      () => `${151 + Math.floor(Math.random() * 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    ];
    return publicRanges[Math.floor(Math.random() * publicRanges.length)]();
  }

  private generateRealisticDataSize(): number {
    // Generate realistic data sizes based on common traffic patterns
    const patterns = [
      () => Math.floor(Math.random() * 1000) + 100, // Small requests (100B - 1KB)
      () => Math.floor(Math.random() * 10000) + 1000, // Medium requests (1KB - 10KB)
      () => Math.floor(Math.random() * 100000) + 10000, // Large requests (10KB - 100KB)
      () => Math.floor(Math.random() * 1000000) + 100000, // Very large (100KB - 1MB)
    ];
    const weights = [0.6, 0.25, 0.1, 0.05]; // Most traffic is small
    
    let random = Math.random();
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return patterns[i]();
      }
    }
    return patterns[0]();
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

export const networkMonitor = new NetworkMonitor();

// Start monitoring when the module is loaded
networkMonitor.start();
