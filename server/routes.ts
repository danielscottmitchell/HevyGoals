import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Hevy API Helpers
async function fetchHevyWorkouts(apiKey: string, page: number = 1): Promise<any> {
    const response = await fetch(`https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=10`, {
        headers: { 'api-key': apiKey }
    });
    
    if (!response.ok) {
        throw new Error(`Hevy API Error: ${response.statusText}`);
    }
    
    return response.json();
}

async function fetchHevyWorkoutEvents(apiKey: string, since: Date, page: number = 1): Promise<any> {
    const sinceStr = since.toISOString();
    const response = await fetch(`https://api.hevyapp.com/v1/workouts/events?page=${page}&pageSize=10&since=${encodeURIComponent(sinceStr)}`, {
        headers: { 'api-key': apiKey }
    });
    
    if (!response.ok) {
        throw new Error(`Hevy API Error: ${response.statusText}`);
    }
    
    return response.json();
}

async function fetchWorkoutById(apiKey: string, workoutId: string): Promise<any> {
    const response = await fetch(`https://api.hevyapp.com/v1/workouts/${workoutId}`, {
        headers: { 'api-key': apiKey }
    });
    
    if (!response.ok) {
        throw new Error(`Hevy API Error: ${response.statusText}`);
    }
    
    return response.json();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Profile Routes
  app.get(api.profile.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json(user);
  });

  app.post(api.profile.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    try {
      const input = api.profile.update.input.parse(req.body);
      const user = await storage.updateUserProfile(userId, input);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message || "Validation error" });
      }
      throw err;
    }
  });

  // Settings Routes
  app.get(api.settings.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const settings = await storage.getHevyConnection(userId);
    if (!settings) return res.status(404).json({ message: "No settings found" });
    
    res.json(settings);
  });

  app.post(api.settings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    try {
        const bodySchema = api.settings.update.input.extend({
          targetWeightLb: z.coerce.string(),
          selectedYear: z.coerce.number(),
          bodyweightLb: z.coerce.string(),
        });
        const input = bodySchema.parse(req.body);
        const updated = await storage.updateHevyConnection(userId, input);
        res.json(updated);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Validation error:", err.errors);
            res.status(400).json(err.issues);
        } else {
            console.error("Settings update error:", err);
            res.status(500).json({ message: "Internal Error" });
        }
    }
  });

  app.post(api.settings.refresh.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const connection = await storage.getHevyConnection(userId);
    if (!connection || !connection.apiKey) {
        return res.status(400).json({ message: "No API Key configured" });
    }

    try {
        const isFullSync = !connection.lastSyncAt;
        const updatedWorkouts: any[] = [];
        const deletedIds: string[] = [];
        
        // Create bodyweight lookup function
        const getBodyweight = async (date: Date) => storage.getWeightForDate(userId, date);

        if (isFullSync) {
            // Full sync: fetch all workouts
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const data = await fetchHevyWorkouts(connection.apiKey, page);
                updatedWorkouts.push(...data.workouts);
                
                if (page >= data.page_count) {
                    hasMore = false;
                } else {
                    page++;
                }
                
                if (page > 50) break; // Safety limit
            }
        } else {
            // Incremental sync: use events endpoint
            let page = 1;
            let hasMore = true;
            const updatedIds: string[] = [];

            while (hasMore) {
                const data = await fetchHevyWorkoutEvents(connection.apiKey, connection.lastSyncAt, page);
                
                for (const event of data.events || []) {
                    if (event.type === 'updated') {
                        // Events endpoint provides full workout data
                        if (event.workout) {
                            updatedWorkouts.push(event.workout);
                        } else {
                            // If only ID provided, fetch full workout
                            updatedIds.push(event.id);
                        }
                    } else if (event.type === 'deleted') {
                        deletedIds.push(event.id);
                    }
                }
                
                if (page >= data.page_count) {
                    hasMore = false;
                } else {
                    page++;
                }
                
                if (page > 10) break; // Safety limit for incremental
            }

            // Fetch full details for any workouts we only got IDs for
            for (const id of updatedIds) {
                try {
                    const workout = await fetchWorkoutById(connection.apiKey, id);
                    updatedWorkouts.push(workout);
                } catch (e) {
                    console.error(`Failed to fetch workout ${id}:`, e);
                }
            }
        }

        // Handle deletions and get affected years
        let deletionAffectedYears: number[] = [];
        if (deletedIds.length > 0) {
            deletionAffectedYears = await storage.deleteWorkouts(userId, deletedIds);
            // If any deletion IDs weren't found locally, conservatively recalculate selected year
            // This handles edge case where deletions occurred for workouts we never synced
            const selectedYear = connection.selectedYear || new Date().getFullYear();
            if (!deletionAffectedYears.includes(selectedYear)) {
                deletionAffectedYears.push(selectedYear);
            }
        }

        // Save/update workouts
        await storage.upsertWorkouts(userId, updatedWorkouts, getBodyweight);

        // Calculate exercise PRs first (populates prEvents table)
        const allStoredWorkouts = await storage.getAllWorkoutsRawJson(userId);
        await storage.calculateExercisePrs(userId, allStoredWorkouts, getBodyweight);

        // Then recalculate aggregates for affected years (counts PRs from prEvents)
        const affectedYears = new Set<number>();
        for (const w of updatedWorkouts) {
            affectedYears.add(new Date(w.start_time).getFullYear());
        }
        for (const year of deletionAffectedYears) {
            affectedYears.add(year);
        }
        for (const year of Array.from(affectedYears)) {
            await storage.recalculateAggregatesAndPrs(userId, year);
        }
        
        // Update last sync
        await storage.updateHevyConnection(userId, { 
            apiKey: connection.apiKey, 
            lastSyncAt: new Date() 
        });

        const syncType = isFullSync ? 'full sync' : 'incremental';
        const deleteMsg = deletedIds.length > 0 ? `, ${deletedIds.length} deleted` : '';
        res.json({ success: true, message: `Synced ${updatedWorkouts.length} workouts (${syncType})${deleteMsg}` });

    } catch (err: any) {
        console.error("Sync Error:", err);
        res.status(500).json({ message: "Sync failed: " + err.message });
    }
  });

  // Weight Log Routes
  app.get(api.weightLog.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const entries = await storage.getWeightLog(userId);
    res.json(entries);
  });

  app.post(api.weightLog.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    try {
        const inputSchema = z.object({
            date: z.string(),
            weightLb: z.coerce.string(),
        });
        const input = inputSchema.parse(req.body);
        const entry = await storage.addWeightLogEntry(userId, input);
        res.status(201).json(entry);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json(err.issues);
        } else {
            console.error("Weight log error:", err);
            res.status(500).json({ message: "Internal Error" });
        }
    }
  });

  app.delete('/api/weight-log/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const id = parseInt(req.params.id);
    
    await storage.deleteWeightLogEntry(userId, id);
    res.sendStatus(204);
  });

  // Exercise PRs Routes
  app.get(api.exercisePrs.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const prs = await storage.getExercisePrs(userId);
    res.json(prs);
  });

  // Top Workouts Route
  app.get(api.topWorkouts.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const topWorkouts = await storage.getTopWorkouts(userId, 100);
    res.json(topWorkouts);
  });

  // Dashboard Routes
  app.get(api.dashboard.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    
    const settings = await storage.getHevyConnection(userId);
    const year = settings?.selectedYear || new Date().getFullYear();
    const goalLb = settings?.targetWeightLb ? parseFloat(settings.targetWeightLb) : 3000000;

    const stats = await storage.getDashboardStats(userId, year, goalLb);
    const chartData = await storage.getChartData(userId, year, goalLb);
    const heatmapData = await storage.getHeatmapData(userId, year);
    const recentPrs = await storage.getRecentPrs(userId);

    res.json({
        stats,
        chartData,
        heatmapData,
        recentPrs
    });
  });

  return httpServer;
}
