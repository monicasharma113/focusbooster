import { 
  settings, blockedSites, sessions, browsingHistory,
  type Settings, type InsertSettings,
  type BlockedSite, type InsertBlockedSite,
  type Session, type InsertSession,
  type BrowsingHistory, type InsertBrowsingHistory
} from "@shared/schema";

// Storage interface for all our data models
export interface IStorage {
  // Settings
  getSettings(userId: string): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Blocked Sites
  getBlockedSites(userId: string): Promise<BlockedSite[]>;
  addBlockedSite(site: InsertBlockedSite): Promise<BlockedSite>;
  updateBlockedSite(id: number, isActive: boolean): Promise<BlockedSite | undefined>;
  deleteBlockedSite(id: number): Promise<boolean>;
  
  // Sessions
  getSessions(userId: string): Promise<Session[]>;
  startSession(session: InsertSession): Promise<Session>;
  completeSession(id: number, endTime: Date): Promise<Session | undefined>;
  
  // Browsing History
  getBrowsingHistory(userId: string): Promise<BrowsingHistory[]>;
  addBrowsingHistoryEntry(entry: InsertBrowsingHistory): Promise<BrowsingHistory>;
  getWebsiteStatistics(userId: string): Promise<{url: string, totalTime: number}[]>;
  getCategoryStatistics(userId: string): Promise<{category: string, totalTime: number}[]>;
}

export class MemStorage implements IStorage {
  private settings: Map<string, Settings>;
  private blockedSites: Map<number, BlockedSite>;
  private sessions: Map<number, Session>;
  private browsingHistory: Map<number, BrowsingHistory>;
  private currentBlockedSiteId: number;
  private currentSessionId: number;
  private currentHistoryId: number;

  constructor() {
    this.settings = new Map();
    this.blockedSites = new Map();
    this.sessions = new Map();
    this.browsingHistory = new Map();
    this.currentBlockedSiteId = 1;
    this.currentSessionId = 1;
    this.currentHistoryId = 1;
  }

  async getSettings(userId: string): Promise<Settings | undefined> {
    return this.settings.get(userId);
  }

  async updateSettings(settings: InsertSettings): Promise<Settings> {
    // If settings already exist, update them, otherwise create new
    const existing = this.settings.get(settings.userId);
    const id = existing?.id || 1;
    
    const updatedSettings: Settings = { ...settings, id };
    this.settings.set(settings.userId, updatedSettings);
    return updatedSettings;
  }

  async getBlockedSites(userId: string): Promise<BlockedSite[]> {
    return Array.from(this.blockedSites.values())
      .filter(site => site.userId === userId);
  }

  async addBlockedSite(site: InsertBlockedSite): Promise<BlockedSite> {
    const id = this.currentBlockedSiteId++;
    const newSite: BlockedSite = { ...site, id };
    this.blockedSites.set(id, newSite);
    return newSite;
  }

  async updateBlockedSite(id: number, isActive: boolean): Promise<BlockedSite | undefined> {
    const site = this.blockedSites.get(id);
    if (!site) return undefined;

    const updatedSite: BlockedSite = { ...site, isActive };
    this.blockedSites.set(id, updatedSite);
    return updatedSite;
  }

  async deleteBlockedSite(id: number): Promise<boolean> {
    return this.blockedSites.delete(id);
  }

  async getSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId);
  }

  async startSession(session: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const newSession: Session = { ...session, id };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async completeSession(id: number, endTime: Date): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const completedSession: Session = { ...session, endTime, completed: true };
    this.sessions.set(id, completedSession);
    return completedSession;
  }

  async getBrowsingHistory(userId: string): Promise<BrowsingHistory[]> {
    return Array.from(this.browsingHistory.values())
      .filter(entry => entry.userId === userId);
  }

  async addBrowsingHistoryEntry(entry: InsertBrowsingHistory): Promise<BrowsingHistory> {
    const id = this.currentHistoryId++;
    const newEntry: BrowsingHistory = { ...entry, id };
    this.browsingHistory.set(id, newEntry);
    return newEntry;
  }

  async getWebsiteStatistics(userId: string): Promise<{url: string, totalTime: number}[]> {
    const history = await this.getBrowsingHistory(userId);
    
    // Group by URL and sum time spent
    const stats = history.reduce<Record<string, number>>((acc, entry) => {
      const timeSpent = entry.timeSpent || 0;
      acc[entry.url] = (acc[entry.url] || 0) + timeSpent;
      return acc;
    }, {});
    
    return Object.entries(stats).map(([url, totalTime]) => ({ url, totalTime }));
  }

  async getCategoryStatistics(userId: string): Promise<{category: string, totalTime: number}[]> {
    const history = await this.getBrowsingHistory(userId);
    
    // Group by category and sum time spent
    const stats = history.reduce<Record<string, number>>((acc, entry) => {
      if (!entry.category) return acc;
      
      const timeSpent = entry.timeSpent || 0;
      acc[entry.category] = (acc[entry.category] || 0) + timeSpent;
      return acc;
    }, {});
    
    return Object.entries(stats).map(([category, totalTime]) => ({ category, totalTime }));
  }
}

export const storage = new MemStorage();
