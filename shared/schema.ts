import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth"; // Import users from auth module

export * from "./models/auth";

// === TABLE DEFINITIONS ===

// Hevy Connections
export const hevyConnections = pgTable("hevy_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Change varchar to text to match users.id
  apiKey: text("api_key").notNull(), // In a real app, encrypt this!
  lastSyncAt: timestamp("last_sync_at"),
  status: text("status").default("ok"), // ok, auth_error, rate_limited, error
  targetWeightLb: numeric("target_weight_lb").default("3000000"),
  selectedYear: integer("selected_year").default(new Date().getFullYear()),
});

// Workouts
export const workouts = pgTable("workouts", {
  id: text("id").primaryKey(), // Hevy Workout ID
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  volumeLb: numeric("volume_lb").notNull(),
  rawJson: jsonb("raw_json"), // Store full payload
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily Aggregates (for fast dashboard loading)
export const dailyAggregates = pgTable("daily_aggregates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(), // YYYY-MM-DD
  year: integer("year").notNull(),
  volumeLb: numeric("volume_lb").notNull().default("0"),
  workoutsCount: integer("workouts_count").notNull().default(0),
  prsCount: integer("prs_count").notNull().default(0),
});

// PR Events
export const prEvents = pgTable("pr_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  workoutId: text("workout_id"),
  exerciseTemplateId: text("exercise_template_id"),
  exerciseName: text("exercise_name"),
  type: text("type").notNull(), // exercise_max_weight, exercise_max_workout_volume, daily_total_volume
  value: numeric("value").notNull(),
  previousBest: numeric("previous_best"),
  delta: numeric("delta"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const hevyConnectionsRelations = relations(hevyConnections, ({ one }) => ({
  user: one(users, {
    fields: [hevyConnections.userId],
    references: [users.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one }) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
}));

export const dailyAggregatesRelations = relations(dailyAggregates, ({ one }) => ({
  user: one(users, {
    fields: [dailyAggregates.userId],
    references: [users.id],
  }),
}));

export const prEventsRelations = relations(prEvents, ({ one }) => ({
  user: one(users, {
    fields: [prEvents.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertHevyConnectionSchema = createInsertSchema(hevyConnections).omit({ id: true, lastSyncAt: true, status: true });
export const insertWorkoutSchema = createInsertSchema(workouts);
export const insertDailyAggregateSchema = createInsertSchema(dailyAggregates).omit({ id: true });
export const insertPrEventSchema = createInsertSchema(prEvents).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// Connection Settings
export type HevyConnection = typeof hevyConnections.$inferSelect;
export type InsertHevyConnection = z.infer<typeof insertHevyConnectionSchema>;
export type UpdateHevyConnectionRequest = Partial<InsertHevyConnection>;

// Workouts
export type Workout = typeof workouts.$inferSelect;

// Dashboard Data
export interface DashboardStats {
  totalLiftedLb: number;
  goalLb: number;
  percentageComplete: number;
  daysRemaining: number;
  aheadBehindLb: number;
  requiredPerDayLb: number;
  projectedYearEndLb: number;
  sessionsCount: number;
  daysLiftedCount: number;
  lastSyncAt: string | null;
}

export interface ChartDataPoint {
  date: string;
  actualVolume: number;
  targetVolume: number;
  cumulativeActual: number;
  cumulativeTarget: number;
}

export interface HeatmapDay {
  date: string;
  volumeLb: number;
  count: number;
  prCount: number;
}

export interface PrFeedItem {
  id: number;
  date: string;
  type: string;
  exerciseName?: string;
  value: number;
  delta?: number;
}

// Responses
export type DashboardResponse = {
  stats: DashboardStats;
  chartData: ChartDataPoint[];
  heatmapData: HeatmapDay[];
  recentPrs: PrFeedItem[];
};
