import { 
  users, 
  networkLogs, 
  alerts, 
  connections, 
  trafficMetrics,
  type User, 
  type InsertUser,
  type NetworkLog,
  type InsertNetworkLog,
  type Alert,
  type InsertAlert,
  type Connection,
  type InsertConnection,
  type TrafficMetric,
  type InsertTrafficMetric
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, sum } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Network log methods
  createNetworkLog(log: InsertNetworkLog): Promise<NetworkLog>;
  getNetworkLogs(limit?: number, offset?: number): Promise<NetworkLog[]>;
  getNetworkLogsByTimeRange(startTime: Date, endTime: Date): Promise<NetworkLog[]>;
  searchNetworkLogs(query: string, limit?: number): Promise<NetworkLog[]>;

  // Alert methods
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlerts(limit?: number): Promise<Alert[]>;
  resolveAlert(id: number): Promise<void>;

  // Connection methods
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, updates: Partial<Connection>): Promise<void>;
  getActiveConnections(): Promise<Connection[]>;
  getTopConnections(limit?: number): Promise<Connection[]>;

  // Traffic metrics methods
  createTrafficMetric(metric: InsertTrafficMetric): Promise<TrafficMetric>;
  getLatestTrafficMetrics(): Promise<TrafficMetric | undefined>;
  getTrafficMetricsByTimeRange(startTime: Date, endTime: Date): Promise<TrafficMetric[]>;

  // Dashboard data
  getDashboardStats(): Promise<{
    totalTraffic: string;
    activeConnections: number;
    blockedRequests: number;
    activeAlerts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createNetworkLog(log: InsertNetworkLog): Promise<NetworkLog> {
    const [networkLog] = await db
      .insert(networkLogs)
      .values(log)
      .returning();
    return networkLog;
  }

  async getNetworkLogs(limit = 50, offset = 0): Promise<NetworkLog[]> {
    return await db
      .select()
      .from(networkLogs)
      .orderBy(desc(networkLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getNetworkLogsByTimeRange(startTime: Date, endTime: Date): Promise<NetworkLog[]> {
    return await db
      .select()
      .from(networkLogs)
      .where(
        and(
          gte(networkLogs.timestamp, startTime),
          lte(networkLogs.timestamp, endTime)
        )
      )
      .orderBy(desc(networkLogs.timestamp));
  }

  async searchNetworkLogs(query: string, limit = 50): Promise<NetworkLog[]> {
    return await db
      .select()
      .from(networkLogs)
      .where(
        sql`${networkLogs.sourceIp} ILIKE ${`%${query}%`} OR 
            ${networkLogs.destinationHost} ILIKE ${`%${query}%`} OR
            ${networkLogs.destinationIp} ILIKE ${`%${query}%`}`
      )
      .orderBy(desc(networkLogs.timestamp))
      .limit(limit);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(alerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.isResolved, false))
      .orderBy(desc(alerts.timestamp));
  }

  async getAlerts(limit = 50): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.timestamp))
      .limit(limit);
  }

  async resolveAlert(id: number): Promise<void> {
    await db
      .update(alerts)
      .set({ 
        isResolved: true, 
        resolvedAt: new Date() 
      })
      .where(eq(alerts.id, id));
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db
      .insert(connections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateConnection(id: number, updates: Partial<Connection>): Promise<void> {
    await db
      .update(connections)
      .set(updates)
      .where(eq(connections.id, id));
  }

  async getActiveConnections(): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(eq(connections.isActive, true))
      .orderBy(desc(connections.lastActivity));
  }

  async getTopConnections(limit = 10): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .orderBy(desc(connections.totalDataSize))
      .limit(limit);
  }

  async createTrafficMetric(metric: InsertTrafficMetric): Promise<TrafficMetric> {
    const [newMetric] = await db
      .insert(trafficMetrics)
      .values(metric)
      .returning();
    return newMetric;
  }

  async getLatestTrafficMetrics(): Promise<TrafficMetric | undefined> {
    const [metric] = await db
      .select()
      .from(trafficMetrics)
      .orderBy(desc(trafficMetrics.timestamp))
      .limit(1);
    return metric || undefined;
  }

  async getTrafficMetricsByTimeRange(startTime: Date, endTime: Date): Promise<TrafficMetric[]> {
    return await db
      .select()
      .from(trafficMetrics)
      .where(
        and(
          gte(trafficMetrics.timestamp, startTime),
          lte(trafficMetrics.timestamp, endTime)
        )
      )
      .orderBy(desc(trafficMetrics.timestamp));
  }

  async getDashboardStats(): Promise<{
    totalTraffic: string;
    activeConnections: number;
    blockedRequests: number;
    activeAlerts: number;
  }> {
    const latest = await this.getLatestTrafficMetrics();
    const activeAlerts = await db
      .select({ count: count() })
      .from(alerts)
      .where(eq(alerts.isResolved, false));

    return {
      totalTraffic: latest?.totalTraffic || '0',
      activeConnections: latest?.activeConnections || 0,
      blockedRequests: latest?.blockedRequests || 0,
      activeAlerts: activeAlerts[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
