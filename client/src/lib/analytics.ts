import { getStorageItem, setStorageItem } from './chromeStorage';
import { apiRequest } from './queryClient';

// Website categories for classification
export const websiteCategories = {
  social: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com'],
  productivity: ['github.com', 'gitlab.com', 'notion.so', 'trello.com', 'asana.com', 'slack.com'],
  entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'spotify.com'],
  shopping: ['amazon.com', 'ebay.com', 'walmart.com', 'etsy.com', 'aliexpress.com'],
  news: ['cnn.com', 'bbc.com', 'nytimes.com', 'wsj.com', 'reuters.com'],
  education: ['udemy.com', 'coursera.org', 'edx.org', 'khan-academy.org', 'wikipedia.org'],
  email: ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com', 'mail.google.com'],
  search: ['google.com', 'bing.com', 'duckduckgo.com', 'baidu.com', 'yahoo.com']
};

// Determine the category of a URL
export function categorizeUrl(url: string): string {
  try {
    // Extract the domain from the URL
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Check each category
    for (const [category, domains] of Object.entries(websiteCategories)) {
      if (domains.some(d => domain.includes(d))) {
        return category;
      }
    }
    
    return 'other';
  } catch (e) {
    return 'unknown';
  }
}

// Track the visit to a webpage
export async function trackPageVisit(url: string, title: string): Promise<void> {
  const userId = await getStorageItem('userId');
  const visitTime = new Date();
  const category = categorizeUrl(url);
  
  // Store the current activity in storage to track time spent later
  const lastActivity = await getStorageItem('lastActivity');
  
  // If there was a previous activity, calculate the time spent and log it
  if (lastActivity && lastActivity.url !== url) {
    const timeSpent = Math.round((visitTime.getTime() - new Date(lastActivity.startTime).getTime()) / 1000);
    
    // Only log if the time spent is reasonable (< 30 minutes)
    if (timeSpent > 0 && timeSpent < 1800) {
      try {
        await apiRequest('POST', '/api/analytics/history', {
          userId,
          url: lastActivity.url,
          title: lastActivity.title,
          visitTime: lastActivity.startTime,
          timeSpent,
          category: categorizeUrl(lastActivity.url)
        });
      } catch (error) {
        console.error('Failed to log page visit:', error);
      }
    }
  }
  
  // Update the last activity
  await setStorageItem('lastActivity', {
    url,
    title,
    startTime: visitTime.toISOString()
  });
}

// Get the website statistics
export async function getWebsiteStatistics(): Promise<{url: string, totalTime: number}[]> {
  const userId = await getStorageItem('userId');
  
  try {
    const response = await apiRequest('GET', `/api/analytics/websites/${userId}`, undefined);
    return await response.json();
  } catch (error) {
    console.error('Failed to get website statistics:', error);
    return [];
  }
}

// Get the category statistics
export async function getCategoryStatistics(): Promise<{category: string, totalTime: number}[]> {
  const userId = await getStorageItem('userId');
  
  try {
    const response = await apiRequest('GET', `/api/analytics/categories/${userId}`, undefined);
    return await response.json();
  } catch (error) {
    console.error('Failed to get category statistics:', error);
    return [];
  }
}

// Get all browsing history
export async function getBrowsingHistory(): Promise<any[]> {
  const userId = await getStorageItem('userId');
  
  try {
    const response = await apiRequest('GET', `/api/analytics/history/${userId}`, undefined);
    return await response.json();
  } catch (error) {
    console.error('Failed to get browsing history:', error);
    return [];
  }
}

// Format seconds to a readable time string
export function formatTimeSpent(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
