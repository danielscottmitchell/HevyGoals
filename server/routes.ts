import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Hevy API Helper (Simple implementation for now)
async function fetchHevyWorkouts(apiKey: string, page: number = 1): Promise<any> {
    const response = await fetch(`https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=10`, {
        headers: {
            'api-key': apiKey
        }
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
        // Sync Logic
        // 1. Fetch pages until we get them all (for POC, limit to reasonable amount or all)
        let page = 1;
        let hasMore = true;
        const allWorkouts = [];

        while (hasMore) {
            const data = await fetchHevyWorkouts(connection.apiKey, page);
            allWorkouts.push(...data.workouts);
            
            // Check pagination
            if (page >= data.page_count) {
                hasMore = false;
            } else {
                page++;
            }
            
            // Safety break for POC
            if (page > 20) break; // Limit to 200 workouts for safety in POC
        }

        // 2. Save Workouts
        await storage.upsertWorkouts(userId, allWorkouts);

        // 3. Recalculate Aggregates
        const year = connection.selectedYear || new Date().getFullYear();
        await storage.recalculateAggregatesAndPrs(userId, year);
        
        // 4. Update last sync
        await storage.updateHevyConnection(userId, { 
            apiKey: connection.apiKey, 
            lastSyncAt: new Date() 
        });

        res.json({ success: true, message: `Synced ${allWorkouts.length} workouts` });

    } catch (err: any) {
        console.error("Sync Error:", err);
        res.status(500).json({ message: "Sync failed: " + err.message });
    }
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
