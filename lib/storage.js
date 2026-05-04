const STORAGE_KEYS = {
  PROMPTS: "customPrompts",
  BLOCKED_SITES: "blockedSites",
};

function getPrompts() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.PROMPTS, (data) => {
      resolve(data[STORAGE_KEYS.PROMPTS] || []);
    });
  });
}

function savePrompt(prompt) {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.PROMPTS, (data) => {
      const prompts = data[STORAGE_KEYS.PROMPTS] || [];
      prompts.push(prompt);
      chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: prompts }, resolve);
    });
  });
}

function deletePrompt(id) {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.PROMPTS, (data) => {
      const prompts = (data[STORAGE_KEYS.PROMPTS] || []).filter((p) => p.id !== id);
      chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: prompts }, resolve);
    });
  });
}

function getBlockedSites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.BLOCKED_SITES, (data) => {
      resolve(data[STORAGE_KEYS.BLOCKED_SITES] || []);
    });
  });
}

function blockSite(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.BLOCKED_SITES, (data) => {
      const sites = data[STORAGE_KEYS.BLOCKED_SITES] || [];
      if (!sites.includes(url)) {
        sites.push(url);
      }
      chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_SITES]: sites }, resolve);
    });
  });
}

function unblockSite(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.BLOCKED_SITES, (data) => {
      const sites = (data[STORAGE_KEYS.BLOCKED_SITES] || []).filter((s) => s !== url);
      chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_SITES]: sites }, resolve);
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getPrompts,
    savePrompt,
    deletePrompt,
    getBlockedSites,
    blockSite,
    unblockSite,
    STORAGE_KEYS,
  };
}