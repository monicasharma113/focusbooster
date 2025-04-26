import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSettingsSchema, insertBlockedSiteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Settings routes
  app.get("/api/settings/:userId", async (req, res) => {
    const userId = req.params.userId;
    const settings = await storage.getSettings(userId);
    
    if (!settings) {
      // Return default settings if not found
      return res.json({
        id: 0,
        userId,
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        notificationSound: "bell",
        notificationVolume: 50
      });
    }
    
    res.json(settings);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Blocked sites routes
  app.get("/api/blocked-sites/:userId", async (req, res) => {
    const userId = req.params.userId;
    const sites = await storage.getBlockedSites(userId);
    res.json(sites);
  });

  app.post("/api/blocked-sites", async (req, res) => {
    try {
      const siteData = insertBlockedSiteSchema.parse(req.body);
      const newSite = await storage.addBlockedSite(siteData);
      res.json(newSite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid site data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add blocked site" });
      }
    }
  });

  app.patch("/api/blocked-sites/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const updatedSite = await storage.updateBlockedSite(id, isActive);
    if (!updatedSite) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json(updatedSite);
  });

  app.delete("/api/blocked-sites/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteBlockedSite(id);
    
    if (!success) {
      return res.status(404).json({ message: "Site not found" });
    }
    
    res.json({ success: true });
  });

  // Sessions routes
  app.get("/api/sessions/:userId", async (req, res) => {
    const userId = req.params.userId;
    const sessions = await storage.getSessions(userId);
    res.json(sessions);
  });

  app.post("/api/sessions/start", async (req, res) => {
    try {
      const { userId, type } = req.body;
      
      if (!userId || !type) {
        return res.status(400).json({ message: "userId and type are required" });
      }
      
      const session = await storage.startSession({
        userId,
        type,
        startTime: new Date(),
        endTime: undefined,
        completed: false
      });
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  app.post("/api/sessions/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const completedSession = await storage.completeSession(id, new Date());
      
      if (!completedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(completedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/history/:userId", async (req, res) => {
    const userId = req.params.userId;
    const history = await storage.getBrowsingHistory(userId);
    res.json(history);
  });

  app.get("/api/analytics/websites/:userId", async (req, res) => {
    const userId = req.params.userId;
    const stats = await storage.getWebsiteStatistics(userId);
    res.json(stats);
  });

  app.get("/api/analytics/categories/:userId", async (req, res) => {
    const userId = req.params.userId;
    const stats = await storage.getCategoryStatistics(userId);
    res.json(stats);
  });

  app.post("/api/analytics/history", async (req, res) => {
    try {
      const { userId, url, title, visitTime, timeSpent, category } = req.body;
      
      if (!userId || !url || !title) {
        return res.status(400).json({ message: "userId, url, and title are required" });
      }
      
      const entry = await storage.addBrowsingHistoryEntry({
        userId,
        url,
        title,
        visitTime: visitTime ? new Date(visitTime) : new Date(),
        timeSpent,
        category
      });
      
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to add browsing history entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
