import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NetworkLog } from '@shared/schema';
import Sidebar from '@/components/Sidebar';
import TrafficChart from '@/components/TrafficChart';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw } from 'lucide-react';

export default function Traffic() {
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading, refetch } = useQuery<NetworkLog[]>({
    queryKey: ['/api/network-logs', { search: searchQuery, limit: 200 }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '200');
      return fetch(`/api/network-logs?${params}`).then(res => res.json());
    },
  });

  const filteredLogs = logs.filter(log => {
    const protocolMatch = protocolFilter === 'all' || log.protocol.toLowerCase() === protocolFilter.toLowerCase();
    const actionMatch = actionFilter === 'all' || log.action.toLowerCase() === actionFilter.toLowerCase();
    return protocolMatch && actionMatch;
  });

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'ALLOW':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/20">ALLOW</Badge>;
      case 'BLOCK':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/20">BLOCK</Badge>;
      case 'DENY':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/20">DENY</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Generate chart data from logs
  const trafficData = Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
    inbound: Math.random() * 2000000,
    outbound: Math.random() * 1500000,
  }));

  return (
    <div className="flex h-screen bg-background" data-testid="traffic-page">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4" data-testid="traffic-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Network Traffic Analysis</h2>
              <p className="text-sm text-muted-foreground">Detailed traffic monitoring and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search traffic logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="traffic-search"
                />
              </div>
              <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="dns">DNS</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => refetch()} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Traffic Chart */}
          <TrafficChart data={trafficData} />
          
          {/* Traffic Table */}
          <div className="bg-card rounded-lg border border-border" data-testid="traffic-logs-table">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Traffic Logs</h3>
              <p className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {logs.length} logs
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Protocol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-muted rounded animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                        No traffic logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/50" data-testid={`traffic-log-${log.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                          {log.sourceIp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div>
                            <div>{log.destinationHost || log.destinationIp}</div>
                            {log.destinationPort && (
                              <div className="text-xs text-muted-foreground">Port: {log.destinationPort}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">{log.protocol}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatBytes(log.dataSize || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.duration ? `${log.duration}ms` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}