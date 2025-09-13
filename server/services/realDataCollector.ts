import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from '../storage';
import type { InsertNetworkLog, InsertConnection } from '@shared/schema';

const execAsync = promisify(exec);

export class RealDataCollector {
  async collectSystemNetworkData(): Promise<void> {
    try {
      // Collect network interface statistics
      await this.collectNetworkStats();
      
      // Collect active connections (where possible)
      await this.collectActiveConnections();
      
      // Monitor system resource usage
      await this.collectSystemResources();
    } catch (error) {
      console.error('Failed to collect real system data:', error);
    }
  }

  private async collectNetworkStats(): Promise<void> {
    try {
      // Try to get network interface stats (Linux/Unix)
      const { stdout } = await execAsync('cat /proc/net/dev 2>/dev/null || echo "unavailable"');
      
      if (stdout !== 'unavailable\n') {
        const lines = stdout.split('\n').slice(2); // Skip headers
        
        for (const line of lines) {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 9) {
              const interfaceName = parts[0].replace(':', '');
              const bytesReceived = parseInt(parts[1]) || 0;
              const bytesSent = parseInt(parts[9]) || 0;
              
              // Create log entries for significant traffic
              if (bytesReceived > 1000 || bytesSent > 1000) {
                const networkLog: InsertNetworkLog = {
                  sourceIp: '127.0.0.1',
                  destinationHost: `interface-${interfaceName}`,
                  destinationIp: '0.0.0.0',
                  destinationPort: 0,
                  protocol: 'SYSTEM',
                  action: 'ALLOW',
                  dataSize: bytesReceived + bytesSent,
                  duration: 0,
                  metadata: {
                    type: 'interface_stats',
                    interface: interfaceName,
                    bytesReceived,
                    bytesSent
                  }
                };
                
                await storage.createNetworkLog(networkLog);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Network stats collection not available on this platform');
    }
  }

  private async collectActiveConnections(): Promise<void> {
    try {
      // Try to get active network connections
      const { stdout } = await execAsync('ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null || echo "unavailable"');
      
      if (stdout !== 'unavailable\n') {
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.includes('LISTEN') || line.includes('ESTABLISHED')) {
            const parts = line.trim().split(/\s+/);
            
            if (parts.length >= 4) {
              const localAddress = parts[3] || '';
              const [, port] = localAddress.split(':');
              
              if (port && !isNaN(parseInt(port))) {
                const connection: InsertConnection = {
                  sourceIp: '127.0.0.1',
                  destinationHost: 'localhost',
                  destinationIp: '127.0.0.1',
                  destinationPort: parseInt(port),
                  protocol: parts[0]?.toUpperCase() || 'TCP',
                  totalDataSize: 0,
                  connectionCount: 1,
                  isActive: line.includes('ESTABLISHED')
                };
                
                await storage.createConnection(connection);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Connection monitoring not available on this platform');
    }
  }

  private async collectSystemResources(): Promise<void> {
    try {
      // Try to get memory and CPU info
      const { stdout: memInfo } = await execAsync('cat /proc/meminfo 2>/dev/null | head -3 || echo "unavailable"');
      const { stdout: cpuInfo } = await execAsync('cat /proc/loadavg 2>/dev/null || echo "unavailable"');
      
      if (memInfo !== 'unavailable\n' && cpuInfo !== 'unavailable\n') {
        // Parse memory info
        const memLines = memInfo.split('\n');
        const totalMem = this.parseMemoryLine(memLines[0]);
        const freeMem = this.parseMemoryLine(memLines[1]);
        const usedMem = totalMem - freeMem;
        
        // Parse CPU load
        const loadAvg = parseFloat(cpuInfo.split(' ')[0]) || 0;
        
        // Create system resource log
        const resourceLog: InsertNetworkLog = {
          sourceIp: '127.0.0.1',
          destinationHost: 'system-monitor',
          destinationIp: '127.0.0.1',
          destinationPort: 0,
          protocol: 'SYSTEM',
          action: 'ALLOW',
          dataSize: Math.floor(usedMem / 1024), // Convert to KB
          duration: Math.floor(loadAvg * 100),
          metadata: {
            type: 'system_resources',
            memoryUsedMB: Math.floor(usedMem / 1024),
            memoryTotalMB: Math.floor(totalMem / 1024),
            cpuLoad: loadAvg,
            timestamp: new Date().toISOString()
          }
        };
        
        await storage.createNetworkLog(resourceLog);
      }
    } catch (error) {
      console.log('System resource monitoring not available on this platform');
    }
  }

  private parseMemoryLine(line: string): number {
    const match = line.match(/(\d+)\s+kB/);
    return match ? parseInt(match[1]) : 0;
  }

  // Method to integrate with external monitoring tools
  async ingestExternalData(data: {
    logs?: any[];
    connections?: any[];
    alerts?: any[];
  }): Promise<void> {
    try {
      if (data.logs) {
        for (const logData of data.logs) {
          const networkLog: InsertNetworkLog = {
            sourceIp: logData.sourceIp || '0.0.0.0',
            destinationHost: logData.destinationHost,
            destinationIp: logData.destinationIp,
            destinationPort: logData.destinationPort,
            protocol: logData.protocol || 'UNKNOWN',
            action: logData.action || 'ALLOW',
            dataSize: logData.dataSize || 0,
            duration: logData.duration,
            metadata: logData.metadata || {}
          };
          
          await storage.createNetworkLog(networkLog);
        }
      }
      
      console.log('External data ingested successfully');
    } catch (error) {
      console.error('Failed to ingest external data:', error);
    }
  }
}

export const realDataCollector = new RealDataCollector();

// Collect real system data every 5 minutes
setInterval(() => {
  realDataCollector.collectSystemNetworkData();
}, 5 * 60 * 1000);