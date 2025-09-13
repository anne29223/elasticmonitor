import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Save, RefreshCw, Download, Trash2 } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    monitoringEnabled: true,
    alertsEnabled: true,
    realTimeUpdates: true,
    dataRetention: '30',
    alertThreshold: 'medium',
    autoResolve: false,
    logLevel: 'info',
    refreshInterval: '30',
  });

  const [elasticConfig, setElasticConfig] = useState({
    url: 'https://my-elasticsearch-project-ee2bfe.es.eastus.azure.elastic.cloud',
    apiKey: '',
    username: '',
    password: '',
    indexPattern: 'logs-*',
    enabled: false,
    authType: 'basic' as 'apikey' | 'basic',
  });

  const handleSave = async () => {
    try {
      // Save Elasticsearch config if enabled
      if (elasticConfig.enabled && elasticConfig.url && elasticConfig.apiKey) {
        const response = await fetch('/api/elasticsearch/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(elasticConfig),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save Elasticsearch configuration');
        }
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your monitoring settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save Elasticsearch configuration.',
        variant: 'destructive',
      });
    }
  };

  const testElasticsearchConnection = async () => {
    if (!elasticConfig.url || !elasticConfig.apiKey) {
      toast({
        title: 'Missing configuration',
        description: 'Please provide both URL and API key.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/elasticsearch/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: elasticConfig.url, apiKey: elasticConfig.apiKey }),
      });
      
      if (response.ok) {
        toast({
          title: 'Connection successful',
          description: 'Successfully connected to Elasticsearch cluster.',
        });
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: 'Unable to connect to Elasticsearch. Check your credentials.',
        variant: 'destructive',
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: 'Export started',
      description: 'Your data export will be ready shortly.',
    });
  };

  const handleClearLogs = () => {
    toast({
      title: 'Logs cleared',
      description: 'Old network logs have been removed.',
      variant: 'destructive',
    });
  };

  return (
    <div className="flex h-screen bg-background" data-testid="settings-page">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">Configure monitoring preferences and system settings</p>
            </div>
            <Button onClick={handleSave} data-testid="save-settings">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Monitoring Settings */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center space-x-3 mb-6">
              <SettingsIcon className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Monitoring Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="monitoring-enabled" className="text-sm font-medium">
                    Enable Network Monitoring
                  </Label>
                  <Switch
                    id="monitoring-enabled"
                    checked={settings.monitoringEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, monitoringEnabled: checked }))
                    }
                    data-testid="toggle-monitoring"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alerts-enabled" className="text-sm font-medium">
                    Security Alerts
                  </Label>
                  <Switch
                    id="alerts-enabled"
                    checked={settings.alertsEnabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, alertsEnabled: checked }))
                    }
                    data-testid="toggle-alerts"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="realtime-updates" className="text-sm font-medium">
                    Real-time Updates
                  </Label>
                  <Switch
                    id="realtime-updates"
                    checked={settings.realTimeUpdates}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, realTimeUpdates: checked }))
                    }
                    data-testid="toggle-realtime"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data-retention" className="text-sm font-medium">
                    Data Retention (days)
                  </Label>
                  <Select value={settings.dataRetention} onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, dataRetention: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold" className="text-sm font-medium">
                    Alert Threshold
                  </Label>
                  <Select value={settings.alertThreshold} onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, alertThreshold: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval" className="text-sm font-medium">
                    Refresh Interval (seconds)
                  </Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="10"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, refreshInterval: e.target.value }))
                    }
                    data-testid="refresh-interval-input"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Elasticsearch Configuration */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6">Elasticsearch Integration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect to your Elasticsearch cluster to import real network log data instead of using simulated traffic.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="elastic-enabled" className="text-sm font-medium">
                  Enable Elasticsearch Integration
                </Label>
                <Switch
                  id="elastic-enabled"
                  checked={elasticConfig.enabled}
                  onCheckedChange={(checked) => 
                    setElasticConfig(prev => ({ ...prev, enabled: checked }))
                  }
                  data-testid="toggle-elasticsearch"
                />
              </div>
              
              {elasticConfig.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="elastic-url" className="text-sm font-medium">
                      Elasticsearch URL
                    </Label>
                    <Input
                      id="elastic-url"
                      type="url"
                      placeholder="https://your-cluster.es.region.cloud.es.io"
                      value={elasticConfig.url}
                      onChange={(e) => 
                        setElasticConfig(prev => ({ ...prev, url: e.target.value }))
                      }
                      data-testid="elastic-url-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="elastic-api-key" className="text-sm font-medium">
                      API Key
                    </Label>
                    <Input
                      id="elastic-api-key"
                      type="password"
                      placeholder="Enter your Elasticsearch API key"
                      value={elasticConfig.apiKey}
                      onChange={(e) => 
                        setElasticConfig(prev => ({ ...prev, apiKey: e.target.value }))
                      }
                      data-testid="elastic-api-key-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="elastic-index" className="text-sm font-medium">
                      Index Pattern
                    </Label>
                    <Input
                      id="elastic-index"
                      placeholder="logs-*, firewall-*, network-*"
                      value={elasticConfig.indexPattern}
                      onChange={(e) => 
                        setElasticConfig(prev => ({ ...prev, indexPattern: e.target.value }))
                      }
                      data-testid="elastic-index-input"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={testElasticsearchConnection}
                      className="w-full"
                      data-testid="test-connection-button"
                    >
                      Test Connection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Data Management */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6">Data Management</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={handleExportData} className="flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
              
              <Button variant="outline" className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Database
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleClearLogs}
                className="flex items-center justify-center"
                data-testid="clear-logs-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Old Logs
              </Button>
            </div>
          </Card>

          {/* System Information */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6">System Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="text-sm text-foreground font-mono">v2.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Database Status</span>
                  <span className="text-sm text-green-400">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">WebSocket</span>
                  <span className="text-sm text-green-400">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monitoring Service</span>
                  <span className="text-sm text-green-400">Running</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm text-foreground">2h 15m 33s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Memory Usage</span>
                  <span className="text-sm text-foreground">142 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Log Storage</span>
                  <span className="text-sm text-foreground">1.2 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Backup</span>
                  <span className="text-sm text-foreground">2 hours ago</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}