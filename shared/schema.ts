import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  workDuration: integer("work_duration").notNull().default(25), // minutes
  breakDuration: integer("break_duration").notNull().default(5), // minutes
  longBreakDuration: integer("long_break_duration").notNull().default(15), // minutes
  sessionsBeforeLongBreak: integer("sessions_before_long_break").notNull().default(4),
  autoStartBreaks: boolean("auto_start_breaks").notNull().default(true),
  autoStartPomodoros: boolean("auto_start_pomodoros").notNull().default(false),
  notificationSound: text("notification_sound").notNull().default("bell"),
  notificationVolume: integer("notification_volume").notNull().default(50),
});

// Define the blocked sites schema
export const blockedSites = pgTable("blocked_sites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Define the sessions schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  type: text("type").notNull(), // "work", "break", "long-break"
  completed: boolean("completed").notNull().default(false),
});

// Define the browsing history schema
export const browsingHistory = pgTable("browsing_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  visitTime: timestamp("visit_time").notNull(),
  timeSpent: integer("time_spent"), // seconds
  category: text("category"),
});

// Create insert schemas
export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  workDuration: true,
  breakDuration: true,
  longBreakDuration: true,
  sessionsBeforeLongBreak: true,
  autoStartBreaks: true,
  autoStartPomodoros: true,
  notificationSound: true,
  notificationVolume: true,
});

export const insertBlockedSiteSchema = createInsertSchema(blockedSites).pick({
  userId: true,
  url: true,
  isActive: true,
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  startTime: true,
  endTime: true,
  type: true,
  completed: true,
});

export const insertBrowsingHistorySchema = createInsertSchema(browsingHistory).pick({
  userId: true,
  url: true,
  title: true,
  visitTime: true,
  timeSpent: true,
  category: true,
});

// Define the insert types
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertBlockedSite = z.infer<typeof insertBlockedSiteSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertBrowsingHistory = z.infer<typeof insertBrowsingHistorySchema>;

// Define the select types
export type Settings = typeof settings.$inferSelect;
export type BlockedSite = typeof blockedSites.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type BrowsingHistory = typeof browsingHistory.$inferSelect;
