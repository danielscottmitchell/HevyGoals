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
  userId: text("user_id").notNull().unique().references(() => users.id),
  apiKey: text("api_key").notNull(), 
  lastSyncAt: timestamp("last_sync_at"),
  status: text("status").default("ok"), 
  targetWeightLb: numeric("target_weight_lb").default("3000000"),
  selectedYear: integer("selected_year").default(new Date().getFullYear()),
  bodyweightLb: numeric("bodyweight_lb").default("180"), // User's bodyweight for bodyweight exercises
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

// Weight Log - tracks bodyweight over time
export const weightLog = pgTable("weight_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  weightLb: numeric("weight_lb").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exercise Templates - cached from Hevy to get exercise_type
export const exerciseTemplates = pgTable("exercise_templates", {
  id: text("id").primaryKey(), // Hevy Exercise Template ID
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  exerciseType: text("exercise_type").notNull(), // weight_reps, bodyweight, bodyweight_weighted, bodyweight_assisted, duration, etc.
  primaryMuscleGroup: text("primary_muscle_group"),
  equipmentCategory: text("equipment_category"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exercise PRs - tracks best performances per exercise
export const exercisePrs = pgTable("exercise_prs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  exerciseTemplateId: text("exercise_template_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  exerciseType: text("exercise_type"), // weight_reps, bodyweight, bodyweight_assisted, bodyweight_weighted, duration, etc.
  maxWeightLb: numeric("max_weight_lb"), // Heaviest weight lifted
  maxWeightReps: integer("max_weight_reps"), // Reps at max weight
  maxWeightDate: date("max_weight_date"),
  maxSetVolumeLb: numeric("max_set_volume_lb"), // Highest single set volume
  maxSetVolumeDate: date("max_set_volume_date"),
  maxSessionVolumeLb: numeric("max_session_volume_lb"), // Highest session volume for this exercise
  maxSessionVolumeDate: date("max_session_volume_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const weightLogRelations = relations(weightLog, ({ one }) => ({
  user: one(users, {
    fields: [weightLog.userId],
    references: [users.id],
  }),
}));

export const exercisePrsRelations = relations(exercisePrs, ({ one }) => ({
  user: one(users, {
    fields: [exercisePrs.userId],
    references: [users.id],
  }),
}));

export const exerciseTemplatesRelations = relations(exerciseTemplates, ({ one }) => ({
  user: one(users, {
    fields: [exerciseTemplates.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertHevyConnectionSchema = createInsertSchema(hevyConnections).omit({ 
  id: true, 
  userId: true, 
  lastSyncAt: true, 
  status: true 
});
export const insertWorkoutSchema = createInsertSchema(workouts);
export const insertDailyAggregateSchema = createInsertSchema(dailyAggregates).omit({ id: true });
export const insertPrEventSchema = createInsertSchema(prEvents).omit({ id: true, createdAt: true });
export const insertWeightLogSchema = createInsertSchema(weightLog).omit({ id: true, userId: true, createdAt: true });
export const insertExercisePrSchema = createInsertSchema(exercisePrs).omit({ id: true, updatedAt: true });
export const insertExerciseTemplateSchema = createInsertSchema(exerciseTemplates).omit({ updatedAt: true });

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
  lastWorkoutVolume: number;
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

// Weight Log Types
export type WeightLogEntry = typeof weightLog.$inferSelect;
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;

// Exercise PR Types
export type ExercisePr = typeof exercisePrs.$inferSelect;
export type InsertExercisePr = z.infer<typeof insertExercisePrSchema>;

// Exercise Template Types
export type ExerciseTemplate = typeof exerciseTemplates.$inferSelect;
export type InsertExerciseTemplate = z.infer<typeof insertExerciseTemplateSchema>;
