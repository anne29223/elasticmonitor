import { useQuery } from '@tanstack/react-query';
import { NetworkLog, TrafficMetric } from '@shared/schema';
import Sidebar from '@/components/Sidebar';
import TrafficChart from '@/components/TrafficChart';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Globe, Clock } from 'lucide-react';
import { useState } from 'react';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: logs = [] } = useQuery<NetworkLog[]>({
    queryKey: ['/api/network-logs', { limit: 1000 }],
    queryFn: () => fetch('/api/network-logs?limit=1000').then(res => res.json()),
  });

  const { data: metrics = [] } = useQuery<TrafficMetric[]>({
    queryKey: ['/api/traffic-metrics'],
    queryFn: () => fetch('/api/traffic-metrics').then(res => res.json()),
  });

  // Analytics calculations
  const protocolStats = logs.reduce((acc, log) => {
    acc[log.protocol] = (acc[log.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDestinations = logs.reduce((acc, log) => {
    if (log.destinationHost) {
      acc[log.destinationHost] = (acc[log.destinationHost] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
    
    const hourLogs = logs.filter(log => {
      const logHour = new Date(log.timestamp);
      return logHour.getHours() === hour.getHours() && 
             logHour.getDate() === hour.getDate();
    });

    return {
      timestamp: hour.toISOString(),
      inbound: hourLogs.filter(log => log.action === 'ALLOW').reduce((sum, log) => sum + (log.dataSize || 0), 0),
      outbound: hourLogs.filter(log => log.action === 'BLOCK').reduce((sum, log) => sum + (log.dataSize || 0), 0),
    };
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-screen bg-background" data-testid="analytics-page">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Network Analytics</h2>
              <p className="text-sm text-muted-foreground">Deep insights into network patterns and trends</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Traffic Overview Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrafficChart data={hourlyTraffic} />
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Peak Hour</p>
                    <p className="text-lg font-bold text-foreground">
                      {new Date().getHours()}:00 - {new Date().getHours() + 1}:00
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center space-x-3">
                  <Globe className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Destinations</p>
                    <p className="text-lg font-bold text-foreground">
                      {Object.keys(topDestinations).length}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center space-x-3">
                  <Clock className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-lg font-bold text-foreground">
                      {Math.round(logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length || 0)}ms
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Protocol Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Protocol Distribution</h3>
              <div className="space-y-4">
                {Object.entries(protocolStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([protocol, count]) => {
                    const percentage = (count / logs.length) * 100;
                    return (
                      <div key={protocol} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{protocol}</Badge>
                          <span className="text-sm text-foreground">{count} requests</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-background rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Top Destinations</h3>
              <div className="space-y-3">
                {Object.entries(topDestinations)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([destination, count], index) => (
                    <div key={destination} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-primary/20 text-primary rounded text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground font-medium">{destination}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{count} requests</span>
                        <Badge variant="outline" className="text-xs">
                          {((count / logs.length) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          {/* Traffic Patterns */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Traffic Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Peak Activity Hours</h4>
                <div className="space-y-2">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const hourLogs = logs.filter(log => new Date(log.timestamp).getHours() === hour);
                    const isActive = hourLogs.length > 0;
                    return (
                      <div key={hour} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-background rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full ${isActive ? 'bg-primary' : 'bg-muted'}`}
                              style={{ width: `${Math.min((hourLogs.length / 10) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {hourLogs.length}
                          </span>
                        </div>
                      </div>
                    );
                  }).slice(0, 12)}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Security Events</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Blocked Requests</span>
                    <span className="text-sm text-foreground font-medium">
                      {logs.filter(log => log.action === 'BLOCK').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Allowed Requests</span>
                    <span className="text-sm text-foreground font-medium">
                      {logs.filter(log => log.action === 'ALLOW').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-sm text-green-400 font-medium">
                      {logs.length > 0 ? ((logs.filter(log => log.action === 'ALLOW').length / logs.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Response Time</span>
                    <span className="text-sm text-foreground font-medium">
                      {Math.round(logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length || 0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Data</span>
                    <span className="text-sm text-foreground font-medium">
                      {formatBytes(logs.reduce((sum, log) => sum + (log.dataSize || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requests/Hour</span>
                    <span className="text-sm text-foreground font-medium">
                      {Math.round(logs.length / 24)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}