import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertNetworkLogSchema, insertAlertSchema, insertConnectionSchema } from "@shared/schema";
import { elasticsearchService } from "./services/elasticsearchService";
import { networkMonitor } from "./services/networkMonitor";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Network logs endpoints
  app.get("/api/network-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      let logs;
      if (search) {
        logs = await storage.searchNetworkLogs(search, limit);
      } else {
        logs = await storage.getNetworkLogs(limit, offset);
      }

      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network logs" });
    }
  });

  app.post("/api/network-logs", async (req, res) => {
    try {
      const validatedData = insertNetworkLogSchema.parse(req.body);
      const log = await storage.createNetworkLog(validatedData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid network log data" });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const alerts = activeOnly 
        ? await storage.getActiveAlerts()
        : await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.resolveAlert(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Connections endpoints
  app.get("/api/connections", async (req, res) => {
    try {
      const top = req.query.top === 'true';
      const connections = top 
        ? await storage.getTopConnections()
        : await storage.getActiveConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Traffic metrics endpoint
  app.get("/api/traffic-metrics", async (req, res) => {
    try {
      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;

      let metrics;
      if (startTime && endTime) {
        metrics = await storage.getTrafficMetricsByTimeRange(startTime, endTime);
      } else {
        const latest = await storage.getLatestTrafficMetrics();
        metrics = latest ? [latest] : [];
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic metrics" });
    }
  });

  // System data collection endpoint - for future integration with system monitoring
  app.post("/api/system-data", async (req, res) => {
    try {
      // This endpoint can receive real network data from external monitoring tools
      // Instead of Elasticsearch, this allows integration with:
      // - Windows netstat output
      // - Linux ss/netstat commands
      // - Network adapter statistics
      // - Firewall logs
      
      const { logs, connections, alerts } = req.body;
      
      if (logs && Array.isArray(logs)) {
        for (const logData of logs) {
          const validatedLog = insertNetworkLogSchema.parse(logData);
          await storage.createNetworkLog(validatedLog);
        }
      }
      
      if (connections && Array.isArray(connections)) {
        for (const connData of connections) {
          const validatedConn = insertConnectionSchema.parse(connData);
          await storage.createConnection(validatedConn);
        }
      }
      
      if (alerts && Array.isArray(alerts)) {
        for (const alertData of alerts) {
          const validatedAlert = insertAlertSchema.parse(alertData);
          await storage.createAlert(validatedAlert);
        }
      }
      
      res.json({ success: true, message: "System data ingested successfully" });
    } catch (error) {
      res.status(400).json({ error: "Invalid system data format" });
    }
  });

  // Real-time system stats endpoint
  app.get("/api/system-stats", async (req, res) => {
    try {
      // This could integrate with actual system monitoring
      // For now, provide enhanced simulated data
      const stats = {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        networkInterfaces: [
          { name: 'eth0', bytesIn: Math.floor(Math.random() * 1000000000), bytesOut: Math.floor(Math.random() * 800000000) },
          { name: 'wlan0', bytesIn: Math.floor(Math.random() * 500000000), bytesOut: Math.floor(Math.random() * 400000000) }
        ],
        openPorts: [22, 80, 443, 3000, 5000],
        activeProcesses: Math.floor(Math.random() * 200) + 50,
        firewallStatus: 'enabled',
        lastUpdated: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  // Elasticsearch configuration endpoints
  app.post("/api/elasticsearch/config", async (req, res) => {
    try {
      const { url, apiKey, indexPattern, enabled } = req.body;
      
      if (enabled && (!url || !apiKey)) {
        return res.status(400).json({ error: "URL and API key are required when enabled" });
      }
      
      // Update the Elasticsearch service configuration
      elasticsearchService.updateConfig({ url, apiKey, indexPattern, enabled });
      
      // If enabled, start initial sync
      if (enabled) {
        setTimeout(() => {
          elasticsearchService.syncRecentLogs().catch(console.error);
        }, 1000);
      }
      
      res.json({ success: true, message: "Elasticsearch configuration saved and sync started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save Elasticsearch configuration" });
    }
  });

  app.post("/api/elasticsearch/test", async (req, res) => {
    try {
      const { url, apiKey } = req.body;
      
      if (!url || !apiKey) {
        return res.status(400).json({ error: "URL and API key are required" });
      }
      
      // Test connection using the service
      const result = await elasticsearchService.testConnection(url, apiKey);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.message, details: result.details });
      }
    } catch (error) {
      res.status(500).json({ error: "Connection test failed" });
    }
  });

  // Elasticsearch data endpoints
  app.get("/api/elasticsearch/logs", async (req, res) => {
    try {
      const query = req.query.q ? JSON.parse(req.query.q as string) : {};
      const size = parseInt(req.query.size as string) || 50;
      
      const logs = await elasticsearchService.searchLogs(query, size);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Elasticsearch logs" });
    }
  });

  app.post("/api/elasticsearch/sync", async (req, res) => {
    try {
      await elasticsearchService.syncRecentLogs();
      res.json({ success: true, message: "Manual sync completed" });
    } catch (error) {
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // Export data endpoint
  app.get("/api/export", async (req, res) => {
    try {
      const type = req.query.type as string;
      const format = req.query.format as string || 'json';
      
      let data;
      switch (type) {
        case 'logs':
          data = await storage.getNetworkLogs(1000);
          break;
        case 'alerts':
          data = await storage.getAlerts(1000);
          break;
        case 'connections':
          data = await storage.getActiveConnections();
          break;
        default:
          return res.status(400).json({ error: "Invalid export type" });
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
        res.send(csv);
      } else {
        res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe') {
          // Handle subscription requests
          console.log('Client subscribed to:', data.channel);
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send initial data
    sendInitialData(ws);
  });

  // Broadcast real-time updates
  networkMonitor.on('networkLog', (log) => {
    broadcast(wss, { type: 'networkLog', data: log });
  });

  networkMonitor.on('alert', (alert) => {
    broadcast(wss, { type: 'alert', data: alert });
  });

  networkMonitor.on('metricsUpdate', (metrics) => {
    broadcast(wss, { type: 'metricsUpdate', data: metrics });
  });

  return httpServer;
}

function broadcast(wss: WebSocketServer, message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

async function sendInitialData(ws: WebSocket) {
  try {
    const stats = await storage.getDashboardStats();
    const alerts = await storage.getActiveAlerts();
    const logs = await storage.getNetworkLogs(10);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'initialData',
        data: { stats, alerts, logs }
      }));
    }
  } catch (error) {
    console.error('Failed to send initial data:', error);
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}
