import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NetworkLog } from '@shared/schema';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Filter, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Logs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const { data: logs = [], isLoading, refetch } = useQuery<NetworkLog[]>({
    queryKey: ['/api/network-logs', { search: searchQuery, limit: 500 }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '500');
      return fetch(`/api/network-logs?${params}`).then(res => res.json());
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export?type=logs&format=csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'network-logs-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export successful',
        description: 'Network logs have been exported to CSV.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export logs.',
        variant: 'destructive',
      });
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchMatch = !searchQuery || 
      log.sourceIp.includes(searchQuery) ||
      log.destinationHost?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.destinationIp?.includes(searchQuery);
    
    const protocolMatch = protocolFilter === 'all' || 
      log.protocol.toLowerCase() === protocolFilter.toLowerCase();
    
    const actionMatch = actionFilter === 'all' || 
      log.action.toLowerCase() === actionFilter.toLowerCase();

    const timeMatch = timeFilter === 'all' || (() => {
      const logTime = new Date(log.timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
      
      switch (timeFilter) {
        case '1h': return diffHours <= 1;
        case '6h': return diffHours <= 6;
        case '24h': return diffHours <= 24;
        case '7d': return diffHours <= 168;
        default: return true;
      }
    })();
    
    return searchMatch && protocolMatch && actionMatch && timeMatch;
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

  return (
    <div className="flex h-screen bg-background" data-testid="logs-page">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Network Logs</h2>
              <p className="text-sm text-muted-foreground">Detailed network activity logs and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search logs, IPs, domains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="logs-search"
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
                  <SelectItem value="udp">UDP</SelectItem>
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
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold text-foreground">{filteredLogs.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Allowed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredLogs.filter(log => log.action === 'ALLOW').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredLogs.filter(log => log.action === 'BLOCK').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Transferred</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatBytes(filteredLogs.reduce((sum, log) => sum + (log.dataSize || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Network Activity Logs</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} logs
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Protocol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/50" data-testid={`detailed-log-${log.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                        {log.sourceIp}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <div>
                          <div className="font-medium">{log.destinationHost || log.destinationIp}</div>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}