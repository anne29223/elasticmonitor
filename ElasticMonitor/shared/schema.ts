import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const networkLogs = pgTable("network_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  destinationIp: varchar("destination_ip", { length: 45 }),
  destinationHost: text("destination_host"),
  destinationPort: integer("destination_port"),
  protocol: varchar("protocol", { length: 10 }).notNull(),
  action: varchar("action", { length: 10 }).notNull(), // ALLOW, BLOCK, DENY
  dataSize: integer("data_size").default(0), // bytes
  duration: integer("duration"), // milliseconds
  userId: varchar("user_id"),
  metadata: jsonb("metadata"),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  severity: varchar("severity", { length: 10 }).notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourceIp: varchar("source_ip", { length: 45 }),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow().notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  destinationHost: text("destination_host").notNull(),
  destinationIp: varchar("destination_ip", { length: 45 }),
  destinationPort: integer("destination_port"),
  protocol: varchar("protocol", { length: 10 }).notNull(),
  totalDataSize: integer("total_data_size").default(0),
  connectionCount: integer("connection_count").default(1),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity", { withTimezone: true }).defaultNow(),
});

export const trafficMetrics = pgTable("traffic_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  totalTraffic: decimal("total_traffic", { precision: 15, scale: 2 }).default('0'), // in bytes
  activeConnections: integer("active_connections").default(0),
  blockedRequests: integer("blocked_requests").default(0),
  protocolDistribution: jsonb("protocol_distribution"),
  topDestinations: jsonb("top_destinations"),
});

// Relations
export const networkLogsRelations = relations(networkLogs, ({ one }) => ({
  user: one(users, {
    fields: [networkLogs.userId],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ many }) => ({
  relatedLogs: many(networkLogs),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertNetworkLogSchema = createInsertSchema(networkLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  startTime: true,
  lastActivity: true,
});

export const insertTrafficMetricsSchema = createInsertSchema(trafficMetrics).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type NetworkLog = typeof networkLogs.$inferSelect;
export type InsertNetworkLog = z.infer<typeof insertNetworkLogSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type TrafficMetric = typeof trafficMetrics.$inferSelect;
export type InsertTrafficMetric = z.infer<typeof insertTrafficMetricsSchema>;
