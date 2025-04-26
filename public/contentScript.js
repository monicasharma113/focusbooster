// This content script runs on every page to track browsing time
// and show blocked page overlay when needed

// State
let isBlocked = false;
let currentUrl = window.location.href;
let pageStartTime = Date.now();

// Initialize
async function initialize() {
  // Check if we're in a work session and if this site is blocked
  const storage = await chrome.storage.sync.get(['currentSession', 'blockedSites']);
  
  if (storage.currentSession && 
      storage.currentSession.isActive && 
      storage.currentSession.type === 'work') {
    
    // Check if this site is in the blocked list
    if (storage.blockedSites) {
      isBlocked = checkIfBlocked(currentUrl, storage.blockedSites);
      
      if (isBlocked) {
        showBlockedOverlay();
      }
    }
  }
  
  // Send page info to background script for tracking
  chrome.runtime.sendMessage({
    action: 'pageVisit',
    url: currentUrl,
    title: document.title,
    startTime: pageStartTime
  });
}

// Check if URL is blocked
function checkIfBlocked(url, blockedSites) {
  for (const site of blockedSites) {
    if (site.isActive && url.includes(new URL(site.url).hostname)) {
      return true;
    }
  }
  return false;
}

// Show blocked overlay
function showBlockedOverlay() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  overlay.style.zIndex = '9999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.color = 'white';
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.style.padding = '20px';
  overlay.style.textAlign = 'center';
  
  // Create content
  overlay.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
      <line x1="12" y1="2" x2="12" y2="12"></line>
    </svg>
    <h1 style="font-size: 24px; margin: 20px 0;">Site Blocked</h1>
    <p style="font-size: 16px; margin-bottom: 20px;">This site is blocked during your work session to help you stay focused.</p>
    <button id="overlayBackButton" style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">Go Back</button>
  `;
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Add event listener to button
  document.getElementById('overlayBackButton').addEventListener('click', () => {
    history.back();
  });
  
  // Prevent page interaction
  document.body.style.overflow = 'hidden';
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // If session state changes
    if (changes.currentSession) {
      const newSession = changes.currentSession.newValue;
      const oldSession = changes.currentSession.oldValue;
      
      // If we just started a work session, check if we need to block
      if (newSession && newSession.isActive && newSession.type === 'work' &&
          (!oldSession || !oldSession.isActive || oldSession.type !== 'work')) {
        
        // Check if this site is blocked
        chrome.storage.sync.get('blockedSites', (storage) => {
          if (storage.blockedSites) {
            isBlocked = checkIfBlocked(currentUrl, storage.blockedSites);
            
            if (isBlocked) {
              showBlockedOverlay();
            }
          }
        });
      }
      
      // If we just ended a work session, remove block if present
      if ((!newSession || !newSession.isActive || newSession.type !== 'work') &&
          (oldSession && oldSession.isActive && oldSession.type === 'work')) {
        
        if (isBlocked) {
          // Remove overlay if it exists
          const overlay = document.querySelector('div[style*="z-index: 9999999"]');
          if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
          }
          isBlocked = false;
        }
      }
    }
    
    // If blocked sites change
    if (changes.blockedSites) {
      const newBlockedSites = changes.blockedSites.newValue;
      
      // Check if we're in a work session
      chrome.storage.sync.get('currentSession', (storage) => {
        if (storage.currentSession && 
            storage.currentSession.isActive && 
            storage.currentSession.type === 'work') {
          
          // Check if this site is now blocked
          const wasBlocked = isBlocked;
          isBlocked = checkIfBlocked(currentUrl, newBlockedSites);
          
          // If block status changed
          if (!wasBlocked && isBlocked) {
            showBlockedOverlay();
          } else if (wasBlocked && !isBlocked) {
            // Remove overlay if it exists
            const overlay = document.querySelector('div[style*="z-index: 9999999"]');
            if (overlay) {
              overlay.remove();
              document.body.style.overflow = '';
            }
          }
        }
      });
    }
  }
});

// Track when user leaves the page
window.addEventListener('beforeunload', () => {
  const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
  
  // Send time spent to background script
  chrome.runtime.sendMessage({
    action: 'pageExit',
    url: currentUrl,
    title: document.title,
    startTime: pageStartTime,
    timeSpent
  });
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
