import { LocalScanItem, ExtensionSettings } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'phishguard_scan_history',
  SETTINGS: 'phishguard_settings'
};

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiServer: 'http://localhost:8000',
  autoOpenReport: true,
  saveLocalHistory: true
};

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
        resolve(result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS);
      });
    } else {
      const val = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      resolve(val ? JSON.parse(val) : DEFAULT_SETTINGS);
    }
  });
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => resolve());
    } else {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      resolve();
    }
  });
}

export async function getScanHistory(): Promise<LocalScanItem[]> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEYS.HISTORY], (result) => {
        resolve(result[STORAGE_KEYS.HISTORY] || []);
      });
    } else {
      const val = localStorage.getItem(STORAGE_KEYS.HISTORY);
      resolve(val ? JSON.parse(val) : []);
    }
  });
}

export async function addScanToHistory(item: LocalScanItem): Promise<void> {
  const history = await getScanHistory();
  // Keep up to 25 recent items, deduplicating by URL
  const filtered = history.filter(h => h.url !== item.url);
  const updated = [item, ...filtered].slice(0, 25);

  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated }, () => resolve());
    } else {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      resolve();
    }
  });
}
