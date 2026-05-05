(function () {
  let currentToolbar = null;
  let lastSelection = null;
  let lastSelectionRect = null;
  let selectionToolbarEnabled = true;
  let currentSiteBlocked = false;
  let toolbarSettings = getDefaultToolbarSettings();
  const openSidebarIconUrl = chrome.runtime.getURL(
    "assets/hide-sidebar-horiz.svg"
  );

  const TOOLBAR_ICONS = {
    openSidebar: `<span class="toolbar-icon">
        <img src="${openSidebarIconUrl}" alt="" class="toolbar-logo" />
      </span>`,
    copy: `<span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="10" height="10" rx="2"></rect>
          <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
        </svg>
      </span>`,
    explain: `<span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.2 1.1-1.2 2.2"></path>
          <path d="M12 17h.01"></path>
        </svg>
      </span>`,
    translate: `<span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h10"></path>
          <path d="M9 6c0 6-2 10-5 12"></path>
          <path d="M7 11c1.4 1.7 3.1 3 5 4"></path>
          <path d="M14 7h6"></path>
          <path d="M17 5v2"></path>
          <path d="M14 19l3-8 3 8"></path>
          <path d="M15 16h4"></path>
        </svg>
      </span>`,
    summarize: `<span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12"></path>
          <path d="M6 12h12"></path>
          <path d="M6 17h7"></path>
        </svg>
      </span>`,
    ask: `<span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
          <path d="M8 9h8"></path>
          <path d="M8 13h5"></path>
        </svg>
      </span>`,
  };

  function createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "selection-toolbar hidden";
    toolbar.innerHTML = `
      <div class="selection-toolbar-main"></div>
      <form class="ask-panel hidden" autocomplete="off">
        <input type="text" class="ask-input" placeholder="Ask about this selection..." aria-label="Ask about this selection" />
      </form>
    `;
    document.body.appendChild(toolbar);
    renderToolbarButtons(toolbar);
    return toolbar;
  }

  function renderToolbarButtons(toolbar = currentToolbar) {
    if (!toolbar) {
      return;
    }

    const main = toolbar.querySelector(".selection-toolbar-main");
    if (!main) {
      return;
    }

    main.innerHTML = "";
    toolbar.classList.toggle(
      "icon-only",
      toolbarSettings.labelMode === TOOLBAR_LABEL_MODE_ICON_ONLY
    );

    toolbarSettings.buttonOrder.forEach((key) => {
      const action = getToolbarActionByKey(key);
      if (!action || !toolbarSettings.visible[key]) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = action.className;
      button.title = action.title;
      button.setAttribute("aria-label", action.title);
      button.dataset.action = action.action;
      button.innerHTML = `${TOOLBAR_ICONS[key]}<span class="toolbar-label">${action.label}</span>`;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => handleAction(action.action));
      main.appendChild(button);
    });
  }

  function getSelectionInfo() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    return {
      text: selection.toString().trim(),
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  function positionToolbar(toolbar, rect) {
    const toolbarRect = toolbar.getBoundingClientRect();
    let top = rect.top + rect.height + 6;
    let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

    left = Math.max(0, left);
    if (left + toolbarRect.width > window.innerWidth) {
      left = window.innerWidth - toolbarRect.width - 8;
    }
    left = Math.max(8, left);

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
  }

  function showToolbarForSelection(selectionInfo) {
    if (!canShowSelectionToolbar()) {
      hideToolbar();
      return;
    }

    if (!currentToolbar) {
      currentToolbar = createToolbar();
      setupToolbarListeners();
    }

    currentToolbar.style.display = "flex";
    currentToolbar.classList.remove("hidden");
    hideAskPanel({ clear: true });
    positionToolbar(currentToolbar, selectionInfo.rect);
    lastSelection = selectionInfo.text;
    lastSelectionRect = selectionInfo.rect;
  }

  function hideToolbar() {
    if (!currentToolbar) {
      return;
    }

    currentToolbar.style.display = "none";
    currentToolbar.classList.add("hidden");
    hideAskPanel({ clear: true });
  }

  function getBuiltInActionSettings(callback) {
    chrome.storage.local.get(ACTION_SETTINGS_STORAGE_KEY, (data) => {
      callback(normalizeActionSettings(data[ACTION_SETTINGS_STORAGE_KEY]));
    });
  }

  function sendRuntimeMessage(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error("[ChatGPT Sidebar] message send failed:", error);
    }
  }

  function canShowSelectionToolbar() {
    return selectionToolbarEnabled && !currentSiteBlocked;
  }

  function hideAskPanel(options = {}) {
    if (!currentToolbar) {
      return;
    }

    const askPanel = currentToolbar.querySelector(".ask-panel");
    const askInput = currentToolbar.querySelector(".ask-input");
    if (!askPanel) {
      return;
    }

    askPanel.classList.add("hidden");
    currentToolbar.classList.remove("ask-mode");

    if (options.clear && askInput) {
      askInput.value = "";
    }
  }

  function showAskPanel() {
    if (!currentToolbar || !lastSelection) {
      return;
    }

    const askPanel = currentToolbar.querySelector(".ask-panel");
    const askInput = currentToolbar.querySelector(".ask-input");
    if (!askPanel || !askInput) {
      return;
    }

    askPanel.classList.remove("hidden");
    currentToolbar.classList.add("ask-mode");

    if (lastSelectionRect) {
      positionToolbar(currentToolbar, lastSelectionRect);
    }

    window.setTimeout(() => {
      askInput.focus();
    }, 0);
  }

  function submitAskPrompt() {
    if (!currentToolbar || !lastSelection) {
      return;
    }

    const askInput = currentToolbar.querySelector(".ask-input");
    const question = askInput ? askInput.value.trim() : "";
    if (!question) {
      return;
    }

    sendRuntimeMessage({
      type: "selection-prompt-request",
      prompt: buildAskPrompt(question, lastSelection, {
        pageTitle: document.title,
        pageUrl: window.location.href,
      }),
    });
    hideToolbar();
  }

  function handleAction(action) {
    if (action === "open-sidebar") {
      sendRuntimeMessage({ type: "open-sidebar" });
      hideToolbar();
      return;
    }

    if (!lastSelection) {
      return;
    }

    const selectedText = lastSelection;
    const pageUrl = window.location.href;
    const pageTitle = document.title;

    if (action === "copy") {
      navigator.clipboard.writeText(selectedText);
      hideToolbar();
      return;
    }

    if (action === "ask") {
      showAskPanel();
      return;
    }

    getBuiltInActionSettings((settings) => {
      const selectedAction = settings[action];
      if (!selectedAction) {
        return;
      }

      const prompt = expandPrompt(selectedAction.template, {
        selectedText,
        pageUrl,
        pageTitle,
        targetLanguage: settings.translate.targetLanguage,
      });

      sendRuntimeMessage({ type: "selection-prompt-request", prompt });
    });

    hideToolbar();
  }

  function setupToolbarListeners() {
    if (!currentToolbar) {
      return;
    }
    currentToolbar
      .querySelector(".ask-panel")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        submitAskPrompt();
      });
    currentToolbar
      .querySelector(".ask-input")
      .addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          hideAskPanel({ clear: true });
          if (lastSelectionRect) {
            positionToolbar(currentToolbar, lastSelectionRect);
          }
        }
      });
  }

  function updateToolbarAvailability(callback) {
    chrome.storage.local.get(
      [
        "blockedSites",
        SELECTION_TOOLBAR_ENABLED_STORAGE_KEY,
        TOOLBAR_SETTINGS_STORAGE_KEY,
      ],
      (data) => {
        const blocked = data.blockedSites || [];
        const currentHost = window.location.hostname;
        selectionToolbarEnabled =
          data[SELECTION_TOOLBAR_ENABLED_STORAGE_KEY] !== false;
        toolbarSettings = normalizeToolbarSettings(
          data[TOOLBAR_SETTINGS_STORAGE_KEY]
        );
        currentSiteBlocked = blocked.some(
          (site) => currentHost.includes(site) || site.includes(currentHost)
        );
        renderToolbarButtons();
        if (
          currentToolbar &&
          !currentToolbar.classList.contains("hidden") &&
          lastSelectionRect
        ) {
          positionToolbar(currentToolbar, lastSelectionRect);
        }
        if (!canShowSelectionToolbar()) {
          hideToolbar();
        }
        callback && callback();
      }
    );
  }

  updateToolbarAvailability(() => {
    document.addEventListener("mouseup", (event) => {
      if (!canShowSelectionToolbar()) {
        hideToolbar();
        return;
      }

      if (currentToolbar && currentToolbar.contains(event.target)) {
        return;
      }

      const selectionInfo = getSelectionInfo();
      if (selectionInfo) {
        showToolbarForSelection(selectionInfo);
      } else {
        hideToolbar();
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (!canShowSelectionToolbar()) {
        hideToolbar();
        return;
      }

      if (currentToolbar && !currentToolbar.contains(event.target)) {
        hideToolbar();
      }
    });

    document.addEventListener("scroll", () => {
      if (currentToolbar && !currentToolbar.classList.contains("hidden")) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          positionToolbar(currentToolbar, {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (
        changes.blockedSites ||
        changes[SELECTION_TOOLBAR_ENABLED_STORAGE_KEY] ||
        changes[TOOLBAR_SETTINGS_STORAGE_KEY]
      ) {
        updateToolbarAvailability();
      }
    });
  });
})();
