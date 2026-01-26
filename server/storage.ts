import { db } from "./db";
import {
  hevyConnections,
  workouts,
  dailyAggregates,
  prEvents,
  weightLog,
  exercisePrs,
  type HevyConnection,
  type InsertHevyConnection,
  type Workout,
  type DashboardStats,
  type ChartDataPoint,
  type HeatmapDay,
  type PrFeedItem,
  type WeightLogEntry,
  type InsertWeightLog,
  type ExercisePr,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { eq, and, desc, asc, sum, count, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User Profile
  getUser(userId: string): Promise<User | undefined>;
  updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User | undefined>;
  
  // Hevy Connection
  getHevyConnection(userId: string): Promise<HevyConnection | undefined>;
  updateHevyConnection(userId: string, data: InsertHevyConnection): Promise<HevyConnection>;
  
  // Weight Log
  getWeightLog(userId: string): Promise<WeightLogEntry[]>;
  addWeightLogEntry(userId: string, data: InsertWeightLog): Promise<WeightLogEntry>;
  deleteWeightLogEntry(userId: string, id: number): Promise<boolean>;
  getWeightForDate(userId: string, date: Date): Promise<number>;
  
  // Workouts
  upsertWorkouts(userId: string, workoutsData: any[], getBodyweight: (date: Date) => Promise<number>): Promise<void>;
  deleteWorkouts(userId: string, workoutIds: string[]): Promise<number[]>; // Returns affected years
  getWorkouts(userId: string, year: number): Promise<Workout[]>;
  getAllWorkoutsRawJson(userId: string): Promise<any[]>;
  
  // Exercise PRs
  getExercisePrs(userId: string): Promise<ExercisePr[]>;
  calculateExercisePrs(userId: string, workoutsData: any[], getBodyweight: (date: Date) => Promise<number>): Promise<void>;
  
  // Top Workouts
  getTopWorkouts(userId: string, limit?: number): Promise<{ id: string; title: string | null; date: string; volumeLb: number }[]>;
  
  // Dashboard Aggregation
  getDashboardStats(userId: string, year: number, goalLb: number): Promise<DashboardStats>;
  getChartData(userId: string, year: number, goalLb: number): Promise<ChartDataPoint[]>;
  getHeatmapData(userId: string, year: number): Promise<HeatmapDay[]>;
  getRecentPrs(userId: string, limit?: number): Promise<PrFeedItem[]>;

  // PR Calculation helper
  recalculateAggregatesAndPrs(userId: string, year: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getHevyConnection(userId: string): Promise<HevyConnection | undefined> {
    const [connection] = await db
      .select()
      .from(hevyConnections)
      .where(eq(hevyConnections.userId, userId));
    return connection;
  }

  async updateHevyConnection(userId: string, data: InsertHevyConnection): Promise<HevyConnection> {
    const [connection] = await db
      .insert(hevyConnections)
      .values({ ...data, userId })
      .onConflictDoUpdate({
        target: hevyConnections.userId,
        set: data,
      })
      .returning();
    return connection;
  }

  // Weight Log Methods
  async getWeightLog(userId: string): Promise<WeightLogEntry[]> {
    return db
      .select()
      .from(weightLog)
      .where(eq(weightLog.userId, userId))
      .orderBy(desc(weightLog.date));
  }

  async addWeightLogEntry(userId: string, data: InsertWeightLog): Promise<WeightLogEntry> {
    const [entry] = await db
      .insert(weightLog)
      .values({ ...data, userId })
      .returning();
    return entry;
  }

  async deleteWeightLogEntry(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(weightLog)
      .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)));
    return true;
  }

  async getWeightForDate(userId: string, date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get the closest weight entry on or before this date
    const entries = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), lte(weightLog.date, dateStr)))
      .orderBy(desc(weightLog.date))
      .limit(1);
    
    if (entries.length > 0) {
      return parseFloat(entries[0].weightLb);
    }
    
    // Fallback to the first entry after this date if none before
    const futureEntries = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), gte(weightLog.date, dateStr)))
      .orderBy(asc(weightLog.date))
      .limit(1);
    
    if (futureEntries.length > 0) {
      return parseFloat(futureEntries[0].weightLb);
    }
    
    // Fallback to connection bodyweight setting
    const connection = await this.getHevyConnection(userId);
    return connection?.bodyweightLb ? parseFloat(connection.bodyweightLb) : 180;
  }

  async upsertWorkouts(userId: string, workoutsData: any[], getBodyweight: (date: Date) => Promise<number>): Promise<void> {
    if (workoutsData.length === 0) return;
    
    // Transform Hevy workout to our schema
    const rows = await Promise.all(workoutsData.map(async w => {
      const workoutDate = new Date(w.start_time);
      const bodyweightLb = await getBodyweight(workoutDate);
      return {
        id: w.id,
        userId,
        title: w.title,
        startTime: workoutDate,
        endTime: w.end_time ? new Date(w.end_time) : null,
        volumeLb: calculateVolumeLb(w, bodyweightLb).toString(),
        rawJson: w,
      };
    }));

    await db.insert(workouts)
      .values(rows)
      .onConflictDoUpdate({
        target: workouts.id,
        set: {
            title: sql`excluded.title`,
            startTime: sql`excluded.start_time`,
            endTime: sql`excluded.end_time`,
            volumeLb: sql`excluded.volume_lb`,
            rawJson: sql`excluded.raw_json`
        }
      });
  }

  async deleteWorkouts(userId: string, workoutIds: string[]): Promise<number[]> {
    if (workoutIds.length === 0) return [];
    
    // Get years from workouts before deletion for recalculating aggregates
    const affectedYears = new Set<number>();
    
    for (const id of workoutIds) {
      const [workout] = await db
        .select({ startTime: workouts.startTime })
        .from(workouts)
        .where(and(eq(workouts.id, id), eq(workouts.userId, userId)));
      
      if (workout) {
        affectedYears.add(workout.startTime.getFullYear());
        await db.delete(workouts)
          .where(and(eq(workouts.id, id), eq(workouts.userId, userId)));
      }
    }
    
    return Array.from(affectedYears);
  }

  async getAllWorkoutsRawJson(userId: string): Promise<any[]> {
    const allWorkouts = await db
      .select({ rawJson: workouts.rawJson })
      .from(workouts)
      .where(eq(workouts.userId, userId));
    
    return allWorkouts.map(w => w.rawJson).filter(Boolean);
  }
  
  // Exercise PRs
  async getExercisePrs(userId: string): Promise<ExercisePr[]> {
    return db
      .select()
      .from(exercisePrs)
      .where(eq(exercisePrs.userId, userId))
      .orderBy(desc(exercisePrs.maxWeightLb));
  }

  async getTopWorkouts(userId: string, limit: number = 10): Promise<{ id: string; title: string | null; date: string; volumeLb: number }[]> {
    const results = await db
      .select({
        id: workouts.id,
        title: workouts.title,
        startTime: workouts.startTime,
        volumeLb: workouts.volumeLb,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(sql`CAST(${workouts.volumeLb} AS DECIMAL)`))
      .limit(limit);
    
    return results.map(w => ({
      id: w.id,
      title: w.title,
      date: w.startTime ? w.startTime.toISOString().split('T')[0] : '',
      volumeLb: parseFloat(w.volumeLb || '0'),
    }));
  }

  async calculateExercisePrs(userId: string, workoutsData: any[], getBodyweight: (date: Date) => Promise<number>): Promise<void> {
    // Track PRs per exercise and PR events
    const prMap = new Map<string, {
      exerciseName: string;
      exerciseType: string;
      maxWeightLb: number;
      maxWeightReps: number;
      maxWeightDate: string;
      maxSetVolumeLb: number;
      maxSetVolumeDate: string;
      maxSessionVolumeLb: number;
      maxSessionVolumeDate: string;
    }>();
    
    const prEventsList: {
      userId: string;
      date: string;
      workoutId: string;
      exerciseTemplateId: string;
      exerciseName: string;
      type: string;
      value: string;
      previousBest: string;
      delta: string;
    }[] = [];

    // Sort workouts chronologically to track PR progression
    const sortedWorkouts = [...workoutsData].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.start_time);
      const dateStr = workoutDate.toISOString().split('T')[0];
      const bodyweightLb = await getBodyweight(workoutDate);

      for (const ex of workout.exercises) {
        const exerciseId = ex.exercise_template_id;
        const exerciseName = ex.title;
        const exerciseType = ex.exercise_type || 'weight_reps';
        
        let sessionVolume = 0;
        let sessionMaxWeight = 0;
        let sessionMaxWeightReps = 0;
        let sessionMaxSetVolume = 0;
        
        // First pass: calculate session metrics
        for (const set of ex.sets) {
          const { weightLb, volumeLb } = calculateSetMetrics(set, exerciseType, bodyweightLb);
          sessionVolume += volumeLb;
          
          if (weightLb > sessionMaxWeight) {
            sessionMaxWeight = weightLb;
            sessionMaxWeightReps = set.reps || 0;
          }
          if (volumeLb > sessionMaxSetVolume) {
            sessionMaxSetVolume = volumeLb;
          }
        }

        const current = prMap.get(exerciseId) || {
          exerciseName,
          exerciseType,
          maxWeightLb: 0,
          maxWeightReps: 0,
          maxWeightDate: dateStr,
          maxSetVolumeLb: 0,
          maxSetVolumeDate: dateStr,
          maxSessionVolumeLb: 0,
          maxSessionVolumeDate: dateStr,
        };

        // Check for new max weight PR
        if (sessionMaxWeight > current.maxWeightLb && sessionMaxWeight > 0) {
          const previousBest = current.maxWeightLb;
          prEventsList.push({
            userId,
            date: dateStr,
            workoutId: workout.id,
            exerciseTemplateId: exerciseId,
            exerciseName,
            type: 'exercise_max_weight',
            value: sessionMaxWeight.toString(),
            previousBest: previousBest.toString(),
            delta: (sessionMaxWeight - previousBest).toString(),
          });
          current.maxWeightLb = sessionMaxWeight;
          current.maxWeightReps = sessionMaxWeightReps;
          current.maxWeightDate = dateStr;
        }

        // Check for new max set volume PR
        if (sessionMaxSetVolume > current.maxSetVolumeLb && sessionMaxSetVolume > 0) {
          const previousBest = current.maxSetVolumeLb;
          prEventsList.push({
            userId,
            date: dateStr,
            workoutId: workout.id,
            exerciseTemplateId: exerciseId,
            exerciseName,
            type: 'exercise_max_set_volume',
            value: sessionMaxSetVolume.toString(),
            previousBest: previousBest.toString(),
            delta: (sessionMaxSetVolume - previousBest).toString(),
          });
          current.maxSetVolumeLb = sessionMaxSetVolume;
          current.maxSetVolumeDate = dateStr;
        }

        // Check for new max session volume PR
        if (sessionVolume > current.maxSessionVolumeLb && sessionVolume > 0) {
          const previousBest = current.maxSessionVolumeLb;
          prEventsList.push({
            userId,
            date: dateStr,
            workoutId: workout.id,
            exerciseTemplateId: exerciseId,
            exerciseName,
            type: 'exercise_max_session_volume',
            value: sessionVolume.toString(),
            previousBest: previousBest.toString(),
            delta: (sessionVolume - previousBest).toString(),
          });
          current.maxSessionVolumeLb = sessionVolume;
          current.maxSessionVolumeDate = dateStr;
        }

        prMap.set(exerciseId, current);
      }
    }

    // Clear and insert all exercise PRs
    await db.delete(exercisePrs).where(eq(exercisePrs.userId, userId));
    
    const rows = Array.from(prMap.entries()).map(([exerciseId, data]) => ({
      userId,
      exerciseTemplateId: exerciseId,
      exerciseName: data.exerciseName,
      exerciseType: data.exerciseType,
      maxWeightLb: data.maxWeightLb.toString(),
      maxWeightReps: data.maxWeightReps,
      maxWeightDate: data.maxWeightDate,
      maxSetVolumeLb: data.maxSetVolumeLb.toString(),
      maxSetVolumeDate: data.maxSetVolumeDate,
      maxSessionVolumeLb: data.maxSessionVolumeLb.toString(),
      maxSessionVolumeDate: data.maxSessionVolumeDate,
    }));

    if (rows.length > 0) {
      await db.insert(exercisePrs).values(rows);
    }

    // Insert exercise PR events (delete existing first)
    await db.delete(prEvents).where(
      and(
        eq(prEvents.userId, userId),
        inArray(prEvents.type, ['exercise_max_weight', 'exercise_max_set_volume', 'exercise_max_session_volume'])
      )
    );
    
    if (prEventsList.length > 0) {
      await db.insert(prEvents).values(prEventsList);
    }
  }

  async getWorkouts(userId: string, year: number): Promise<Workout[]> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    return db.select()
      .from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.startTime, startOfYear),
        lte(workouts.startTime, endOfYear)
      ))
      .orderBy(desc(workouts.startTime));
  }

  async recalculateAggregatesAndPrs(userId: string, year: number): Promise<void> {
    // 1. Clear existing aggregates for the year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59); // Fixed end of year

    // Get all workouts for the year
    const userWorkouts = await this.getWorkouts(userId, year);
    
    // Group by date
    const dailyMap = new Map<string, { volume: number, count: number }>();
    
    for (const w of userWorkouts) {
        const day = w.startTime.toISOString().split('T')[0]; // Simple UTC date for now (TODO: User timezone)
        const current = dailyMap.get(day) || { volume: 0, count: 0 };
        dailyMap.set(day, {
            volume: current.volume + parseFloat(w.volumeLb),
            count: current.count + 1
        });
    }

    // Insert Aggregates
    // First delete old ones for this year to be safe (or upsert)
    // Deleting is easier for full recalc
    await db.delete(dailyAggregates).where(and(
        eq(dailyAggregates.userId, userId),
        eq(dailyAggregates.year, year)
    ));

    const aggRows = Array.from(dailyMap.entries()).map(([dateStr, data]) => ({
        userId,
        date: dateStr,
        year,
        volumeLb: data.volume.toString(),
        workoutsCount: data.count,
        prsCount: 0 // We'll update this next
    }));

    if (aggRows.length > 0) {
        await db.insert(dailyAggregates).values(aggRows);
    }

    // PR Calculation (Simple Logic for V1)
    // "Heaviest Day" is easy to check
    // "Heaviest Lift" requires digging into rawJson exercises
    
    // For V1, let's just do "Daily Volume PR" as a proof of concept
    // A real implementation needs to track "all-time bests" which implies looking at previous years too
    // For this year-bound app, let's track "Year Best"
    
    let maxDailyVol = 0;
    const prs: any[] = [];
    
    // Sort aggregates by date
    aggRows.sort((a, b) => a.date.localeCompare(b.date));

    for (const day of aggRows) {
        const vol = parseFloat(day.volumeLb);
        if (vol > maxDailyVol && vol > 0) {
            maxDailyVol = vol;
            // Record PR
            prs.push({
                userId,
                date: day.date,
                type: 'daily_total_volume',
                value: vol.toString(),
                previousBest: (maxDailyVol - vol).toString(), // Previous was lower
                delta: (vol - (maxDailyVol - vol)).toString() // Approximation
            });
        }
    }
    
    // Insert daily volume PRs (only delete daily_total_volume type, preserve exercise PRs)
    await db.delete(prEvents).where(and(
        eq(prEvents.userId, userId),
        eq(prEvents.type, 'daily_total_volume'),
        gte(prEvents.date, startOfYear.toISOString().split('T')[0]),
        lte(prEvents.date, endOfYear.toISOString().split('T')[0])
    ));
    
    if (prs.length > 0) {
        await db.insert(prEvents).values(prs);
    }
    
    // Count ALL PRs (from prEvents table) per day and update daily_aggregates
    // This includes exercise PRs and daily volume PRs
    const allPrEvents = await db
      .select()
      .from(prEvents)
      .where(and(
        eq(prEvents.userId, userId),
        gte(prEvents.date, startOfYear.toISOString().split('T')[0]),
        lte(prEvents.date, endOfYear.toISOString().split('T')[0])
      ));
    
    // Build a map of date -> PR count
    const prCountMap = new Map<string, number>();
    
    for (const pr of allPrEvents) {
      prCountMap.set(pr.date, (prCountMap.get(pr.date) || 0) + 1);
    }
    
    // Update daily_aggregates with the PR counts
    for (const [date, count] of Array.from(prCountMap)) {
      await db.update(dailyAggregates)
        .set({ prsCount: count })
        .where(and(
          eq(dailyAggregates.userId, userId),
          eq(dailyAggregates.date, date)
        ));
    }
  }

  async getDashboardStats(userId: string, year: number, goalLb: number): Promise<DashboardStats> {
    const result = await db
        .select({
            totalVolume: sum(dailyAggregates.volumeLb),
            totalSessions: sum(dailyAggregates.workoutsCount),
            daysLifted: count(dailyAggregates.id)
        })
        .from(dailyAggregates)
        .where(and(
            eq(dailyAggregates.userId, userId),
            eq(dailyAggregates.year, year)
        ));
    
    const stats = result[0];
    const totalLiftedLb = stats.totalVolume ? parseFloat(stats.totalVolume) : 0;
    const percentageComplete = (totalLiftedLb / goalLb) * 100;
    
    // Date math
    const now = new Date();
    const isCurrentYear = now.getFullYear() === year;
    const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const totalDays = 365; // Simplify leap year
    
    const daysRemaining = isCurrentYear ? totalDays - dayOfYear : 0;
    
    // Pacing
    const targetPerDay = goalLb / totalDays;
    const expectedToDate = targetPerDay * (isCurrentYear ? dayOfYear : totalDays);
    const aheadBehindLb = totalLiftedLb - expectedToDate;
    
    const requiredPerDayLb = daysRemaining > 0 ? (goalLb - totalLiftedLb) / daysRemaining : 0;
    const projectedYearEndLb = isCurrentYear && dayOfYear > 0 
        ? (totalLiftedLb / dayOfYear) * totalDays 
        : totalLiftedLb;

    const connection = await this.getHevyConnection(userId);

    return {
        totalLiftedLb,
        goalLb,
        percentageComplete,
        daysRemaining,
        aheadBehindLb,
        requiredPerDayLb,
        projectedYearEndLb,
        sessionsCount: stats.totalSessions ? parseInt(stats.totalSessions) : 0,
        daysLiftedCount: stats.daysLifted,
        lastSyncAt: connection?.lastSyncAt ? connection.lastSyncAt.toISOString() : null
    };
  }

  async getChartData(userId: string, year: number, goalLb: number): Promise<ChartDataPoint[]> {
    const aggregates = await db
        .select()
        .from(dailyAggregates)
        .where(and(
            eq(dailyAggregates.userId, userId),
            eq(dailyAggregates.year, year)
        ))
        .orderBy(asc(dailyAggregates.date));

    const points: ChartDataPoint[] = [];
    let cumulative = 0;
    const targetPerDay = goalLb / 365;
    
    // Determine the date range
    const now = new Date();
    const isCurrentYear = now.getFullYear() === year;
    const endDate = isCurrentYear ? now : new Date(year, 11, 31);
    const endDateStr = endDate.toISOString().split('T')[0];
    const endDayIndex = getDayOfYear(endDate);
    const endTarget = targetPerDay * endDayIndex;
    
    // Add starting point (Jan 1)
    const yearStart = `${year}-01-01`;
    points.push({
        date: yearStart,
        actualVolume: 0,
        targetVolume: targetPerDay,
        cumulativeActual: 0,
        cumulativeTarget: 0
    });
    
    // Add actual workout data points
    for (const agg of aggregates) {
        cumulative += parseFloat(agg.volumeLb);
        const dayIndex = getDayOfYear(new Date(agg.date));
        const targetForDay = targetPerDay * dayIndex;
        
        points.push({
            date: agg.date,
            actualVolume: parseFloat(agg.volumeLb),
            targetVolume: targetPerDay,
            cumulativeActual: cumulative,
            cumulativeTarget: null as any, // null for chart line (connectNulls skips these)
            targetForDay: targetForDay, // Store for tooltip calculation
            aheadBehind: cumulative - targetForDay // Positive = ahead, negative = behind
        });
    }
    
    // Add endpoint with the target value for straight line
    const lastPoint = points[points.length - 1];
    if (lastPoint && lastPoint.date !== endDateStr) {
        points.push({
            date: endDateStr,
            actualVolume: 0,
            targetVolume: targetPerDay,
            cumulativeActual: cumulative,
            cumulativeTarget: endTarget
        });
    } else if (lastPoint) {
        // Update the last point to include the target
        lastPoint.cumulativeTarget = endTarget;
    }

    return points;
  }

  async getHeatmapData(userId: string, year: number): Promise<HeatmapDay[]> {
    const aggregates = await db
        .select()
        .from(dailyAggregates)
        .where(and(
            eq(dailyAggregates.userId, userId),
            eq(dailyAggregates.year, year)
        ));

    return aggregates.map(agg => ({
        date: agg.date,
        volumeLb: parseFloat(agg.volumeLb),
        count: agg.workoutsCount,
        prCount: agg.prsCount
    }));
  }

  async getRecentPrs(userId: string, limit: number = 10): Promise<PrFeedItem[]> {
    // Get all PR events from prEvents table (includes every time a PR was broken)
    const allPrRecords = await db
      .select()
      .from(prEvents)
      .where(eq(prEvents.userId, userId))
      .orderBy(desc(prEvents.date), desc(prEvents.id));
    
    // Convert to PR feed items
    const result: PrFeedItem[] = allPrRecords.map(pr => ({
      id: pr.id,
      date: pr.date,
      type: pr.type,
      exerciseName: pr.exerciseName || 'Workout',
      value: parseFloat(pr.value),
      delta: pr.delta ? parseFloat(pr.delta) : 0,
    }));

    return limit > 0 ? result.slice(0, limit) : result;
  }
}

export const storage = new DatabaseStorage();

// Helpers
function calculateSetMetrics(set: any, exerciseType: string, bodyweightLb: number): { weightLb: number; volumeLb: number } {
    const reps = set.reps || 0;
    if (reps === 0) return { weightLb: 0, volumeLb: 0 };
    
    const weightKg = set.weight_kg || 0;
    const weightLbFromKg = weightKg * 2.20462;
    
    let effectiveWeight = 0;
    
    switch (exerciseType) {
        case 'bodyweight':
            // Pure bodyweight (pushups, pullups, etc.) - use bodyweight as the weight
            effectiveWeight = bodyweightLb;
            break;
        case 'bodyweight_weighted':
            // Weighted bodyweight (weighted pullups, dips with added weight)
            // Total = bodyweight + added weight
            effectiveWeight = bodyweightLb + weightLbFromKg;
            break;
        case 'bodyweight_assisted':
            // Assisted bodyweight (assisted dips, assisted pullups)
            // Total = bodyweight - assistance weight
            effectiveWeight = Math.max(0, bodyweightLb - weightLbFromKg);
            break;
        case 'weight_reps':
        case 'weighted':
        default:
            // Standard weighted exercise (barbell, dumbbell, machine)
            effectiveWeight = weightLbFromKg;
            break;
    }
    
    return {
        weightLb: Math.round(effectiveWeight * 100) / 100,
        volumeLb: Math.round(effectiveWeight * reps)
    };
}

function calculateVolumeLb(workout: any, bodyweightLb: number = 180): number {
    let vol = 0;
    for (const ex of workout.exercises) {
        const exerciseType = ex.exercise_type || 'weight_reps';
        for (const set of ex.sets) {
            const { volumeLb } = calculateSetMetrics(set, exerciseType, bodyweightLb);
            vol += volumeLb;
        }
    }
    return Math.round(vol);
}

function getDayOfYear(date: Date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
