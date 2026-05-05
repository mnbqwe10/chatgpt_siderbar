const STORAGE_KEYS = {
  BLOCKED_SITES: "blockedSites",
};

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
    getBlockedSites,
    blockSite,
    unblockSite,
    STORAGE_KEYS,
  };
}
