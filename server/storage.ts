import { db } from "./db";
import {
  hevyConnections,
  workouts,
  dailyAggregates,
  prEvents,
  type HevyConnection,
  type InsertHevyConnection,
  type Workout,
  type DashboardStats,
  type ChartDataPoint,
  type HeatmapDay,
  type PrFeedItem,
  hevyConnectionsRelations,
} from "@shared/schema";
import { eq, and, desc, asc, sum, count, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Hevy Connection
  getHevyConnection(userId: string): Promise<HevyConnection | undefined>;
  updateHevyConnection(userId: string, data: InsertHevyConnection): Promise<HevyConnection>;
  
  // Workouts
  upsertWorkouts(userId: string, workoutsData: any[]): Promise<void>;
  getWorkouts(userId: string, year: number): Promise<Workout[]>;
  
  // Dashboard Aggregation
  getDashboardStats(userId: string, year: number, goalLb: number): Promise<DashboardStats>;
  getChartData(userId: string, year: number, goalLb: number): Promise<ChartDataPoint[]>;
  getHeatmapData(userId: string, year: number): Promise<HeatmapDay[]>;
  getRecentPrs(userId: string, limit?: number): Promise<PrFeedItem[]>;

  // PR Calculation helper
  recalculateAggregatesAndPrs(userId: string, year: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

  async upsertWorkouts(userId: string, workoutsData: any[]): Promise<void> {
    if (workoutsData.length === 0) return;
    
    // In a real implementation, we would batch this properly
    // For now, naive loop is safer for complex upserts logic, or simpler bulk insert
    // Let's do bulk insert with on conflict ignore/update
    
    // Transform Hevy workout to our schema
    const rows = workoutsData.map(w => ({
      id: w.id,
      userId,
      title: w.title,
      startTime: new Date(w.start_time),
      endTime: w.end_time ? new Date(w.end_time) : null,
      volumeLb: calculateVolumeLb(w).toString(),
      rawJson: w,
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
            
            // Update PR count for that day
            await db.update(dailyAggregates)
                .set({ prsCount: 1 }) // Simple boolean for now
                .where(and(
                    eq(dailyAggregates.userId, userId),
                    eq(dailyAggregates.date, day.date)
                ));
        }
    }
    
    // Insert PRs
    await db.delete(prEvents).where(and(
        eq(prEvents.userId, userId),
        gte(prEvents.date, startOfYear.toISOString().split('T')[0]),
        lte(prEvents.date, endOfYear.toISOString().split('T')[0])
    ));
    
    if (prs.length > 0) {
        await db.insert(prEvents).values(prs);
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

    // Fill gaps or just return aggregates?
    // Let's return sparse data for now, recharts handles it ok usually, or we fill gaps in frontend
    // Better to return cumulative points
    
    const points: ChartDataPoint[] = [];
    let cumulative = 0;
    const targetPerDay = goalLb / 365;

    // Use a map to fill every day? For a nice line chart we probably want sparse but correct cumulative
    // Let's just map the aggregates we have.
    
    for (const agg of aggregates) {
        cumulative += parseFloat(agg.volumeLb);
        const dayIndex = getDayOfYear(new Date(agg.date));
        
        points.push({
            date: agg.date,
            actualVolume: parseFloat(agg.volumeLb),
            targetVolume: targetPerDay,
            cumulativeActual: cumulative,
            cumulativeTarget: targetPerDay * dayIndex
        });
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
    const events = await db
        .select()
        .from(prEvents)
        .where(eq(prEvents.userId, userId))
        .orderBy(desc(prEvents.date))
        .limit(limit);

    return events.map(e => ({
        id: e.id,
        date: e.date,
        type: e.type,
        exerciseName: e.exerciseName || undefined,
        value: parseFloat(e.value),
        delta: e.delta ? parseFloat(e.delta) : 0
    }));
  }
}

export const storage = new DatabaseStorage();

// Helpers
function calculateVolumeLb(workout: any): number {
    let vol = 0;
    for (const ex of workout.exercises) {
        for (const set of ex.sets) {
            if (set.weight_kg && set.reps) {
                vol += (set.weight_kg * 2.20462) * set.reps;
            }
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
