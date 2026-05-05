(function (globalScope) {
  const SELECTION_TOOLBAR_ENABLED_STORAGE_KEY = "selectionToolbarEnabled";
  const TOOLBAR_SETTINGS_STORAGE_KEY = "toolbarSettings";
  const TOOLBAR_LABEL_MODE_ICON_TEXT = "icon-text";
  const TOOLBAR_LABEL_MODE_ICON_ONLY = "icon-only";
  const TOOLBAR_ACTIONS = Object.freeze([
    Object.freeze({
      key: "openSidebar",
      action: "open-sidebar",
      label: "Open",
      title: "Open ChatGPT Sidebar",
      className: "open-sidebar-btn",
    }),
    Object.freeze({
      key: "copy",
      action: "copy",
      label: "Copy",
      title: "Copy selection",
      className: "copy-btn",
    }),
    Object.freeze({
      key: "explain",
      action: "explain",
      label: "Explain",
      title: "Explain selection",
      className: "explain-btn",
    }),
    Object.freeze({
      key: "translate",
      action: "translate",
      label: "Translate",
      title: "Translate selection",
      className: "translate-btn",
    }),
    Object.freeze({
      key: "summarize",
      action: "summarize",
      label: "Summarize",
      title: "Summarize selection",
      className: "summarize-btn",
    }),
    Object.freeze({
      key: "ask",
      action: "ask",
      label: "Ask",
      title: "Ask about selection",
      className: "ask-btn",
    }),
  ]);

  function getDefaultToolbarSettings() {
    const visible = {};
    TOOLBAR_ACTIONS.forEach((action) => {
      visible[action.key] = true;
    });

    return {
      buttonOrder: TOOLBAR_ACTIONS.map((action) => action.key),
      visible,
      labelMode: TOOLBAR_LABEL_MODE_ICON_TEXT,
    };
  }

  function normalizeToolbarSettings(rawSettings) {
    const defaults = getDefaultToolbarSettings();
    const settings = rawSettings && typeof rawSettings === "object"
      ? rawSettings
      : {};
    const knownKeys = TOOLBAR_ACTIONS.map((action) => action.key);
    const order = Array.isArray(settings.buttonOrder)
      ? settings.buttonOrder.filter((key) => knownKeys.includes(key))
      : [];

    knownKeys.forEach((key) => {
      if (!order.includes(key)) {
        order.push(key);
      }
    });

    const visible = { ...defaults.visible };
    if (settings.visible && typeof settings.visible === "object") {
      knownKeys.forEach((key) => {
        if (typeof settings.visible[key] === "boolean") {
          visible[key] = settings.visible[key];
        }
      });
    }

    if (!knownKeys.some((key) => visible[key])) {
      visible.openSidebar = true;
    }

    const labelMode =
      settings.labelMode === TOOLBAR_LABEL_MODE_ICON_ONLY
        ? TOOLBAR_LABEL_MODE_ICON_ONLY
        : TOOLBAR_LABEL_MODE_ICON_TEXT;

    return { buttonOrder: order, visible, labelMode };
  }

  function getToolbarActionByKey(key) {
    return TOOLBAR_ACTIONS.find((action) => action.key === key) || null;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      SELECTION_TOOLBAR_ENABLED_STORAGE_KEY,
      TOOLBAR_SETTINGS_STORAGE_KEY,
      TOOLBAR_LABEL_MODE_ICON_TEXT,
      TOOLBAR_LABEL_MODE_ICON_ONLY,
      TOOLBAR_ACTIONS,
      getDefaultToolbarSettings,
      normalizeToolbarSettings,
      getToolbarActionByKey,
    };
  }

  if (globalScope) {
    globalScope.SELECTION_TOOLBAR_ENABLED_STORAGE_KEY =
      SELECTION_TOOLBAR_ENABLED_STORAGE_KEY;
    globalScope.TOOLBAR_SETTINGS_STORAGE_KEY = TOOLBAR_SETTINGS_STORAGE_KEY;
    globalScope.TOOLBAR_LABEL_MODE_ICON_TEXT = TOOLBAR_LABEL_MODE_ICON_TEXT;
    globalScope.TOOLBAR_LABEL_MODE_ICON_ONLY = TOOLBAR_LABEL_MODE_ICON_ONLY;
    globalScope.TOOLBAR_ACTIONS = TOOLBAR_ACTIONS;
    globalScope.getDefaultToolbarSettings = getDefaultToolbarSettings;
    globalScope.normalizeToolbarSettings = normalizeToolbarSettings;
    globalScope.getToolbarActionByKey = getToolbarActionByKey;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
