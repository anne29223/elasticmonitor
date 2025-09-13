import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Zap, Shield, AlertTriangle, Download, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MetricsCard from '@/components/MetricsCard';
import TrafficChart from '@/components/TrafficChart';
import AlertsList from '@/components/AlertsList';
import NetworkLogs from '@/components/NetworkLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalTraffic: string;
  activeConnections: number;
  blockedRequests: number;
  activeAlerts: number;
}

interface Connection {
  id: number;
  destinationHost: string;
  totalDataSize: number;
  connectionCount: number;
  isActive: boolean;
  startTime: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1h');
  const [trafficData, setTrafficData] = useState<Array<{ timestamp: string; inbound: number; outbound: number }>>([]);

  // Fetch dashboard stats
  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => fetch('/api/dashboard/stats').then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch top connections
  const { data: topConnections = [] } = useQuery<Connection[]>({
    queryKey: ['/api/connections', { top: true }],
    queryFn: () => fetch('/api/connections?top=true').then(res => res.json()),
    refetchInterval: 60000, // Refetch every minute
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'metricsUpdate':
          refetchStats();
          break;
        case 'networkLog':
          // Add to traffic chart data
          const newDataPoint = {
            timestamp: new Date().toISOString(),
            inbound: Math.random() * 1000000,
            outbound: Math.random() * 800000,
          };
          setTrafficData(prev => [...prev.slice(-29), newDataPoint]); // Keep last 30 points
          break;
        case 'alert':
          toast({
            title: 'New Alert',
            description: message.data.title,
            variant: 'destructive',
          });
          break;
        case 'initialData':
          // Handle initial data load
          refetchStats();
          break;
      }
    },
    onOpen: () => {
      console.log('Connected to real-time monitoring');
    },
  });

  // Initialize traffic data
  useEffect(() => {
    const initialData = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 60000).toISOString(),
      inbound: Math.random() * 1000000,
      outbound: Math.random() * 800000,
    }));
    setTrafficData(initialData);
  }, []);

  const handleExport = async (type: string) => {
    try {
      const response = await fetch(`/api/export?type=${type}&format=csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export successful',
        description: `${type} data has been exported.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export data.',
        variant: 'destructive',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTrafficValue = (value: string) => {
    const bytes = parseInt(value);
    return formatBytes(bytes);
  };

  return (
    <div className="flex h-screen bg-background" data-testid="dashboard">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4" data-testid="dashboard-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">ElasticMonitor Dashboard</h2>
              <p className="text-sm text-muted-foreground">Real-time Elasticsearch monitoring and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search logs, IPs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64"
                  data-testid="header-search-input"
                />
              </div>
              
              {/* Time Range Selector */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32" data-testid="time-range-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Export Button */}
              <Button 
                onClick={() => handleExport('logs')}
                className="flex items-center space-x-2"
                data-testid="export-button"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </header>
        
        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6 scrollbar-thin" data-testid="dashboard-content">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="metrics-row">
            <MetricsCard
              title="Total Traffic"
              value={stats ? formatTrafficValue(stats.totalTraffic) : '0 B'}
              change="+12.5% from last hour"
              changeType="positive"
              icon={Globe}
              iconColor="bg-primary/20 text-primary"
            />
            <MetricsCard
              title="Active Connections"
              value={stats?.activeConnections.toString() || '0'}
              change="-3.2% from last hour"
              changeType="negative"
              icon={Zap}
              iconColor="bg-green-500/20 text-green-400"
            />
            <MetricsCard
              title="Blocked Requests"
              value={stats?.blockedRequests.toString() || '0'}
              change="+45.2% from last hour"
              changeType="negative"
              icon={Shield}
              iconColor="bg-red-500/20 text-red-400"
            />
            <MetricsCard
              title="Active Alerts"
              value={stats?.activeAlerts.toString() || '0'}
              change="2 High, 1 Medium"
              changeType="neutral"
              icon={AlertTriangle}
              iconColor="bg-orange-500/20 text-orange-400"
            />
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="charts-row">
            <TrafficChart data={trafficData} />
            
            {/* Protocol Distribution */}
            <div className="chart-container rounded-lg p-6" data-testid="protocol-distribution">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Protocol Distribution</h3>
                <Button variant="ghost" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  { protocol: 'HTTPS', percentage: 65, color: 'bg-primary' },
                  { protocol: 'HTTP', percentage: 20, color: 'bg-green-400' },
                  { protocol: 'DNS', percentage: 10, color: 'bg-yellow-400' },
                  { protocol: 'Other', percentage: 5, color: 'bg-purple-400' },
                ].map((item) => (
                  <div key={item.protocol} className="flex items-center justify-between" data-testid={`protocol-${item.protocol.toLowerCase()}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${item.color} rounded`}></div>
                      <span className="text-foreground">{item.protocol}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-background rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Alerts and Logs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="alerts-logs-section">
            <AlertsList />
            <NetworkLogs />
          </div>
          
          {/* Top Connections Section */}
          <div className="bg-card rounded-lg border border-border" data-testid="top-connections">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Top Connections</h3>
                <Select defaultValue="data-volume">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data-volume">By Data Volume</SelectItem>
                    <SelectItem value="connection-count">By Connection Count</SelectItem>
                    <SelectItem value="duration">By Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topConnections.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground" data-testid="no-connections">
                    No active connections
                  </div>
                ) : (
                  topConnections.slice(0, 3).map((connection) => (
                    <div key={connection.id} className="bg-secondary rounded-lg p-4" data-testid={`connection-${connection.id}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-sm font-medium text-foreground">{connection.destinationHost}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {connection.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Data:</span>
                          <span className="text-xs text-foreground">{formatBytes(connection.totalDataSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Connections:</span>
                          <span className="text-xs text-foreground">{connection.connectionCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Started:</span>
                          <span className="text-xs text-foreground">
                            {new Date(connection.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
