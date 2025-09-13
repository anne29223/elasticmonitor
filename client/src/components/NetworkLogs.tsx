import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NetworkLog } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, ExternalLink } from 'lucide-react';

export default function NetworkLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  });

  const { data: logs = [], isLoading } = useQuery<NetworkLog[]>({
    queryKey: ['/api/network-logs', { search: debouncedSearch, limit: 50 }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', '50');
      return fetch(`/api/network-logs?${params}`).then(res => res.json());
    },
  });

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'ALLOW':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/20">ALLOW</Badge>;
      case 'BLOCK':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/20">BLOCK</Badge>;
      case 'DENY':
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/20">DENY</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="lg:col-span-2 bg-card rounded-lg border border-border" data-testid="network-logs">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Network Logs</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs, IPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
                data-testid="logs-search-input"
              />
            </div>
            <Button variant="outline" size="sm" data-testid="logs-filter-button">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button variant="outline" size="sm" data-testid="logs-view-all-button">
              <ExternalLink className="w-4 h-4 mr-1" />
              View All
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6" data-testid="logs-loading">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-40"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <table className="w-full" data-testid="logs-table">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Protocol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground" data-testid="no-logs">
                    {searchQuery ? 'No logs found matching your search.' : 'No network logs available.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/50" data-testid={`log-row-${log.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono" data-testid={`log-time-${log.id}`}>
                      {formatTime(log.timestamp.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono" data-testid={`log-source-${log.id}`}>
                      {log.sourceIp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`log-destination-${log.id}`}>
                      {log.destinationHost || log.destinationIp}
                      {log.destinationPort && `:${log.destinationPort}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`log-protocol-${log.id}`}>
                      {log.protocol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" data-testid={`log-action-${log.id}`}>
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`log-size-${log.id}`}>
                      {formatBytes(log.dataSize || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
