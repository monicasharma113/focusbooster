// Constants
const BLOCKED_PAGE_URL = chrome.runtime.getURL('index.html#/blocked');
const DEFAULT_SETTINGS = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  notificationSound: "bell",
  notificationVolume: 50
};

// State
let isWorkSessionActive = false;
let blockedSites = [];
let userId = null;
let lastVisitedUrl = null;
let lastVisitedTitle = null;
let lastVisitedTime = null;

// Initialize extension
async function initialize() {
  // Set up storage with default values if not exists
  const storage = await chrome.storage.sync.get(['userId', 'settings', 'blockedSites']);
  
  if (!storage.userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    await chrome.storage.sync.set({ userId });
  } else {
    userId = storage.userId;
  }

  if (!storage.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }

  if (!storage.blockedSites) {
    await chrome.storage.sync.set({ blockedSites: [] });
  } else {
    blockedSites = storage.blockedSites;
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener(handleStorageChange);
  
  // Set up listeners for navigation events
  chrome.webNavigation.onCompleted.addListener(handleNavigation);
  
  // Set up listeners for tab updates
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  
  // Set up alarm listeners
  chrome.alarms.onAlarm.addListener(handleAlarm);
  
  // Check for any active session
  const currentSession = await chrome.storage.sync.get('currentSession');
  if (currentSession.currentSession && currentSession.currentSession.isActive) {
    isWorkSessionActive = currentSession.currentSession.type === 'work';
    
    // If there's an active work session, set up blocking rules
    if (isWorkSessionActive) {
      setupBlockingRules();
    }
  }
}

// Handle storage changes
function handleStorageChange(changes, namespace) {
  if (namespace === 'sync') {
    // Handle blocked sites changes
    if (changes.blockedSites) {
      blockedSites = changes.blockedSites.newValue;
      
      // If we're in a work session, update blocking rules
      if (isWorkSessionActive) {
        setupBlockingRules();
      }
    }
    
    // Handle current session changes
    if (changes.currentSession) {
      const newSession = changes.currentSession.newValue;
      
      if (newSession && newSession.isActive) {
        isWorkSessionActive = newSession.type === 'work';
        
        // If we're in a work session, set up blocking rules
        if (isWorkSessionActive) {
          setupBlockingRules();
        } else {
          removeBlockingRules();
        }
      } else {
        isWorkSessionActive = false;
        removeBlockingRules();
      }
    }
  }
}

// Handle navigation events
async function handleNavigation(details) {
  // Only care about the main frame
  if (details.frameId !== 0) return;
  
  // Get tab information
  try {
    const tab = await chrome.tabs.get(details.tabId);
    
    // If this is a new URL, log the previous one
    if (lastVisitedUrl && lastVisitedUrl !== tab.url) {
      const timeSpent = Math.round((Date.now() - lastVisitedTime) / 1000);
      
      // Only log if time spent is reasonable (< 30 minutes)
      if (timeSpent > 0 && timeSpent < 1800) {
        logPageVisit(lastVisitedUrl, lastVisitedTitle, lastVisitedTime, timeSpent);
      }
    }
    
    // Update last visited info
    lastVisitedUrl = tab.url;
    lastVisitedTitle = tab.title;
    lastVisitedTime = Date.now();
    
    // Check if this URL is blocked and we're in a work session
    if (isWorkSessionActive && isBlocked(tab.url)) {
      // Redirect to blocked page
      chrome.tabs.update(details.tabId, { url: BLOCKED_PAGE_URL });
    }
  } catch (error) {
    console.error('Failed to get tab info:', error);
  }
}

// Handle tab updates
function handleTabUpdate(tabId, changeInfo, tab) {
  // Only care about completed loads with URLs
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  // Check if this URL is blocked and we're in a work session
  if (isWorkSessionActive && isBlocked(tab.url)) {
    // Redirect to blocked page
    chrome.tabs.update(tabId, { url: BLOCKED_PAGE_URL });
  }
}

// Handle alarms
function handleAlarm(alarm) {
  // If this is a timer alarm, show notification
  if (alarm.name === 'timerComplete') {
    showNotification('Timer Complete', 'Your timer has completed!');
  }
}

// Check if a URL is blocked
function isBlocked(url) {
  // Don't block extension pages
  if (url.startsWith('chrome-extension://')) return false;
  
  // Check against the block list
  for (const site of blockedSites) {
    if (site.isActive && url.includes(new URL(site.url).hostname)) {
      return true;
    }
  }
  
  return false;
}

// Set up blocking rules
function setupBlockingRules() {
  // Chrome Manifest V3 uses declarativeNetRequest for blocking
  // This is a simplified version - in production you'd set up
  // proper blocking rules using chrome.declarativeNetRequest
  
  // For now, we rely on the navigation and tab update handlers
  console.log('Blocking rules set up for:', blockedSites.filter(s => s.isActive).map(s => s.url));
}

// Remove blocking rules
function removeBlockingRules() {
  console.log('Blocking rules removed');
}

// Log page visit to backend
async function logPageVisit(url, title, visitTime, timeSpent) {
  try {
    const category = categorizeUrl(url);
    
    // Send to backend
    await fetch('/api/analytics/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        url,
        title,
        visitTime: new Date(visitTime).toISOString(),
        timeSpent,
        category
      }),
    });
  } catch (error) {
    console.error('Failed to log page visit:', error);
  }
}

// Categorize URL
function categorizeUrl(url) {
  try {
    // Extract domain
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Website categories (simplified version)
    const categories = {
      social: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com'],
      productivity: ['github.com', 'gitlab.com', 'notion.so', 'trello.com', 'asana.com'],
      entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'spotify.com'],
      shopping: ['amazon.com', 'ebay.com', 'walmart.com', 'etsy.com'],
      news: ['cnn.com', 'bbc.com', 'nytimes.com', 'wsj.com'],
      education: ['udemy.com', 'coursera.org', 'edx.org', 'khan-academy.org']
    };
    
    // Check each category
    for (const [category, domains] of Object.entries(categories)) {
      if (domains.some(d => domain.includes(d))) {
        return category;
      }
    }
    
    return 'other';
  } catch (e) {
    return 'unknown';
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: 2
  });
}

// Initialize
initialize();
