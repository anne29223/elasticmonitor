import { useQuery } from '@tanstack/react-query';
import { Alert } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function AlertsList() {
  const { toast } = useToast();

  const { data: alerts = [], isLoading, refetch } = useQuery<Alert[]>({
    queryKey: ['/api/alerts', { active: true }],
    queryFn: () => fetch('/api/alerts?active=true').then(res => res.json()),
  });

  const handleResolveAlert = async (alertId: number) => {
    try {
      await apiRequest('PATCH', `/api/alerts/${alertId}/resolve`);
      await refetch();
      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve alert.',
        variant: 'destructive',
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getSeverityIndicatorColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'low':
        return 'bg-blue-400';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6" data-testid="alerts-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border" data-testid="alerts-list">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Alerts</h3>
          <Badge variant="destructive" data-testid="alerts-count">
            {alerts.length} Active
          </Badge>
        </div>
      </div>
      <div className="p-6 space-y-4 max-h-80 overflow-y-auto scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-alerts">
            No active alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`flex items-start space-x-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              data-testid={`alert-${alert.id}`}
            >
              <div className={`w-2 h-2 ${getSeverityIndicatorColor(alert.severity)} rounded-full mt-2 flex-shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground" data-testid={`alert-title-${alert.id}`}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`alert-description-${alert.id}`}>
                      {alert.description}
                    </p>
                    {alert.sourceIp && (
                      <p className="text-xs text-muted-foreground font-mono" data-testid={`alert-source-${alert.id}`}>
                        Source: {alert.sourceIp}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground" data-testid={`alert-time-${alert.id}`}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    className="ml-2"
                    data-testid={`resolve-alert-${alert.id}`}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
