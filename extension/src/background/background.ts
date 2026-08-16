// Background service worker for PhishGuard AI Real-Time Protection

const API_BASE_URL = "http://localhost:8000/api";
const SCAN_CACHE: Map<string, { result: any; timestamp: number }> = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
const NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins notification cooldown per URL
const NOTIFIED_URLS: Map<string, number> = new Map();

console.log("[PhishGuard AI] Extension Background Service Worker Active.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[PhishGuard AI] Extension installed successfully.");
  chrome.storage.local.set({ realtimeProtection: true, authJwt: null });
});

// Listener for Tab URL Updates (Real-Time Protection Mode)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkUrlRealtime(tab.url, tabId);
  }
});

async function checkUrlRealtime(url: string, tabId: number) {
  // Validate protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return; // Ignore internal chrome://, file://, about: pages
  }

  // Check if Real-time Protection is enabled
  const storage = await chrome.storage.local.get(['realtimeProtection', 'authJwt']);
  const isEnabled = storage.realtimeProtection !== false;
  if (!isEnabled) {
    return;
  }

  // Deduplication / Cache check
  const now = Date.now();
  const cached = SCAN_CACHE.get(url);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    handleScanResult(cached.result, url, tabId, storage.authJwt);
    return;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (storage.authJwt) {
      headers['Authorization'] = `Bearer ${storage.authJwt}`;
    }

    const response = await fetch(`${API_BASE_URL}/extension/scan`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        url: url,
        source: 'browser_extension',
        browser: 'chrome'
      })
    });

    if (response.ok) {
      const data = await response.json();
      SCAN_CACHE.set(url, { result: data, timestamp: now });
      handleScanResult(data, url, tabId, storage.authJwt);
    }
  } catch (err) {
    console.error("[PhishGuard AI] Real-time scan error:", err);
  }
}

function handleScanResult(result: any, url: string, tabId: number, jwtToken: string | null) {
  const classification = result.classification;
  const score = result.risk_score;
  const mlPred = result.ml_prediction;
  const mlConf = Math.round((result.ml_confidence || 0) * 100);

  // Trigger Extension Browser Notification for HIGH RISK or CRITICAL
  if (classification === 'CRITICAL' || classification === 'HIGH RISK') {
    const lastNotified = NOTIFIED_URLS.get(url) || 0;
    const now = Date.now();

    if (now - lastNotified > NOTIFICATION_COOLDOWN_MS) {
      NOTIFIED_URLS.set(url, now);

      const notifId = `pg_alert_${Date.now()}`;
      chrome.notifications.create(notifId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `🕷 PHISHGUARD AI — 🚨 ${classification} THREAT DETECTED`,
        message: `This website (${result.domain}) is classified as ${mlPred} (Risk: ${score}/100, Confidence: ${mlConf}%).\nDo NOT enter passwords or credentials!`,
        priority: 2,
        buttons: [{ title: 'VIEW THREAT REPORT' }]
      });

      chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
        if (id === notifId) {
          chrome.tabs.create({ url: `http://localhost:5173/dashboard?scan_id=${result.scan_id}` });
        }
      });
    }
  }
}

// Handle messaging from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SCAN_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        try {
          const storage = await chrome.storage.local.get(['authJwt']);
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (storage.authJwt) {
            headers['Authorization'] = `Bearer ${storage.authJwt}`;
          }

          const response = await fetch(`${API_BASE_URL}/extension/scan`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ url: url, source: 'browser_extension', browser: 'chrome' })
          });
          const data = await response.json();
          sendResponse({ success: true, data: data });
        } catch (err: any) {
          sendResponse({ success: false, error: err.message });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab URL found' });
      }
    });
    return true; // Keep channel open for async response
  }
});
