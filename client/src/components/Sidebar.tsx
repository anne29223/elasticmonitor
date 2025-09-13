import { Shield, BarChart3, Network, AlertTriangle, FileText, Settings, Gauge } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Gauge, current: location === '/' },
    { name: 'Network Traffic', href: '/traffic', icon: Network, current: location === '/traffic' },
    { name: 'Alerts', href: '/alerts', icon: AlertTriangle, current: location === '/alerts', badge: 3 },
    { name: 'Logs', href: '/logs', icon: FileText, current: location === '/logs' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, current: location === '/analytics' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location === '/settings' },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo and Title */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="text-primary-foreground w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">NetGuard Pro</h1>
            <p className="text-xs text-muted-foreground">Network Monitor</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2" data-testid="navigation-menu">
        {navigation.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              data-testid={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md ${
                item.current
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* System Status */}
      <div className="p-4 border-t border-border" data-testid="system-status">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">System Status</span>
          <div className="flex items-center space-x-2">
            <div className="status-indicator">
              <div className="w-2 h-2 bg-green-400 rounded-full status-active"></div>
            </div>
            <span className="text-sm text-green-400">Active</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Uptime: 127d 14h 23m
        </div>
      </div>
    </aside>
  );
}
