(function (globalScope) {
  const PLATFORM_STORAGE_KEY = "selectedPlatform";

  const PLATFORMS = Object.freeze({
    chatgpt: Object.freeze({
      id: "chatgpt",
      label: "ChatGPT (OpenAI)",
      url: "https://chatgpt.com/",
      origin: "https://chatgpt.com",
      bridgeSource: "chatgpt-sidebar-bridge",
      hostPattern: "https://chatgpt.com/*",
      altHostPatterns: ["https://chat.openai.com/*"],
    }),
    copilot: Object.freeze({
      id: "copilot",
      label: "Microsoft 365 Copilot",
      url: "https://m365.cloud.microsoft/chat",
      origin: "https://m365.cloud.microsoft",
      bridgeSource: "m365-copilot-sidebar-bridge",
      hostPattern: "https://m365.cloud.microsoft/*",
      altHostPatterns: [],
    }),
    gemini: Object.freeze({
      id: "gemini",
      label: "Google Gemini",
      url: "https://gemini.google.com/app",
      origin: "https://gemini.google.com",
      bridgeSource: "gemini-sidebar-bridge",
      hostPattern: "https://gemini.google.com/*",
      altHostPatterns: [],
    }),
    deepseek: Object.freeze({
      id: "deepseek",
      label: "DeepSeek",
      url: "https://chat.deepseek.com/",
      origin: "https://chat.deepseek.com",
      bridgeSource: "deepseek-sidebar-bridge",
      hostPattern: "https://chat.deepseek.com/*",
      altHostPatterns: [],
    }),
    claude: Object.freeze({
      id: "claude",
      label: "Claude (Anthropic)",
      url: "https://claude.ai/new",
      origin: "https://claude.ai",
      bridgeSource: "claude-sidebar-bridge",
      hostPattern: "https://claude.ai/*",
      altHostPatterns: [],
    }),
  });

  const PLATFORM_ORDER = ["chatgpt", "copilot", "gemini", "deepseek", "claude"];
  const DEFAULT_PLATFORM = "chatgpt";

  function getPlatformConfig(platformId) {
    return PLATFORMS[platformId] || PLATFORMS[DEFAULT_PLATFORM];
  }

  function getAllPlatforms() {
    return PLATFORM_ORDER.map((id) => PLATFORMS[id]);
  }

  function getSelectedPlatform() {
    return new Promise((resolve) => {
      chrome.storage.local.get(PLATFORM_STORAGE_KEY, (data) => {
        const id = data[PLATFORM_STORAGE_KEY] || DEFAULT_PLATFORM;
        resolve(getPlatformConfig(id));
      });
    });
  }

  function setSelectedPlatform(platformId) {
    return new Promise((resolve) => {
      const id = PLATFORMS[platformId] ? platformId : DEFAULT_PLATFORM;
      chrome.storage.local.set({ [PLATFORM_STORAGE_KEY]: id }, resolve);
    });
  }

  const exports = {
    PLATFORM_STORAGE_KEY,
    PLATFORMS,
    PLATFORM_ORDER,
    DEFAULT_PLATFORM,
    getPlatformConfig,
    getAllPlatforms,
    getSelectedPlatform,
    setSelectedPlatform,
  };

  if (typeof globalScope !== "undefined") {
    Object.assign(globalScope, exports);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : this);
