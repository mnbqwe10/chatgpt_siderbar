(function (globalScope) {
  const ACTION_SETTINGS_STORAGE_KEY = "builtInActionSettings";
  const BUILT_IN_ACTION_ORDER = ["explain", "translate", "summarize"];
  const DEFAULT_ACTION_SETTINGS = Object.freeze({
    explain: Object.freeze({
      label: "Explain",
      template:
        "Explain the following text in clear, simple language. Include a direct explanation, define any important terms, and briefly note why it matters in context.\n\nSelected text:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}\nPage URL: {{page_url}}",
    }),
    translate: Object.freeze({
      label: "Translate",
      targetLanguage: "English",
      template:
        "Translate the following text into {{target_language}}. Preserve the original meaning, tone, and formatting. Do not add commentary unless a short clarification is needed to avoid ambiguity.\n\nText:\n\"{{selected_text}}\"",
    }),
    summarize: Object.freeze({
      label: "Summarize",
      template:
        "Summarize the following text. Start with a concise 1-2 sentence summary, then provide 3 bullet points with the key takeaways.\n\nText:\n\"{{selected_text}}\"",
    }),
  });

  function cloneActionSettings(settings) {
    return JSON.parse(JSON.stringify(settings));
  }

  function getDefaultActionSettings() {
    return cloneActionSettings(DEFAULT_ACTION_SETTINGS);
  }

  function normalizeActionSettings(rawSettings) {
    const defaults = getDefaultActionSettings();
    const settings = rawSettings || {};

    BUILT_IN_ACTION_ORDER.forEach((actionKey) => {
      const rawAction = settings[actionKey];
      if (!rawAction || typeof rawAction !== "object") {
        return;
      }

      if (typeof rawAction.template === "string" && rawAction.template.trim()) {
        defaults[actionKey].template = rawAction.template.trim();
      }

      if (actionKey === "translate") {
        if (
          typeof rawAction.targetLanguage === "string" &&
          rawAction.targetLanguage.trim()
        ) {
          defaults.translate.targetLanguage = rawAction.targetLanguage.trim();
        }
      }
    });

    return defaults;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ACTION_SETTINGS_STORAGE_KEY,
      BUILT_IN_ACTION_ORDER,
      DEFAULT_ACTION_SETTINGS,
      getDefaultActionSettings,
      normalizeActionSettings,
    };
  }

  if (globalScope) {
    globalScope.ACTION_SETTINGS_STORAGE_KEY = ACTION_SETTINGS_STORAGE_KEY;
    globalScope.BUILT_IN_ACTION_ORDER = BUILT_IN_ACTION_ORDER;
    globalScope.DEFAULT_ACTION_SETTINGS = DEFAULT_ACTION_SETTINGS;
    globalScope.getDefaultActionSettings = getDefaultActionSettings;
    globalScope.normalizeActionSettings = normalizeActionSettings;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
