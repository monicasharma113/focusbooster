// Type definitions for chrome storage items
export interface StorageItems {
  userId: string;
  settings: {
    workDuration: number;
    breakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    autoStartBreaks: boolean;
    autoStartPomodoros: boolean;
    notificationSound: string;
    notificationVolume: number;
  };
  blockedSites: {
    id: number;
    url: string;
    isActive: boolean;
  }[];
  currentSession: {
    id: number | null;
    type: 'work' | 'break' | 'long-break';
    startTime: string | null;
    endTime: string | null;
    completed: boolean;
    timeRemaining: number;
    isActive: boolean;
  } | null;
  lastActivity: {
    url: string;
    title: string;
    startTime: string;
  } | null;
}

// Default values for storage items
export const defaultStorageItems: StorageItems = {
  userId: generateUserId(),
  settings: {
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: true,
    autoStartPomodoros: false,
    notificationSound: "bell",
    notificationVolume: 50
  },
  blockedSites: [],
  currentSession: null,
  lastActivity: null
};

// Generate a random user ID if one doesn't exist
function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

// Get a value from chrome storage
export async function getStorageItem<K extends keyof StorageItems>(
  key: K
): Promise<StorageItems[K]> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get([key], (result) => {
        if (result[key] !== undefined) {
          resolve(result[key] as StorageItems[K]);
        } else {
          resolve(defaultStorageItems[key]);
        }
      });
    } else {
      // Fallback for development environment
      const item = localStorage.getItem(key.toString());
      if (item) {
        resolve(JSON.parse(item));
      } else {
        resolve(defaultStorageItems[key]);
      }
    }
  });
}

// Set a value in chrome storage
export async function setStorageItem<K extends keyof StorageItems>(
  key: K,
  value: StorageItems[K]
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ [key]: value }, resolve);
    } else {
      // Fallback for development environment
      localStorage.setItem(key.toString(), JSON.stringify(value));
      resolve();
    }
  });
}

// Get all storage items
export async function getAllStorageItems(): Promise<StorageItems> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(null, (items) => {
        resolve({
          ...defaultStorageItems,
          ...items as Partial<StorageItems>
        });
      });
    } else {
      // Fallback for development environment
      const items: Partial<StorageItems> = {};
      for (const key in defaultStorageItems) {
        const typedKey = key as keyof StorageItems;
        const item = localStorage.getItem(key);
        if (item) {
          items[typedKey] = JSON.parse(item);
        }
      }
      resolve({
        ...defaultStorageItems,
        ...items
      });
    }
  });
}

// Clear all storage items
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.clear(resolve);
    } else {
      // Fallback for development environment
      localStorage.clear();
      resolve();
    }
  });
}

// Add a listener for storage changes
export function addStorageListener(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener(callback);
  }
}

// Remove a listener for storage changes
export function removeStorageListener(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.removeListener(callback);
  }
}
