(function () {
  let currentToolbar = null;
  let lastSelection = null;
  const openSidebarLogoUrl = chrome.runtime.getURL("assets/logo.png");

  const TOOLBAR_ICONS = {
    openSidebar: `
      <span class="toolbar-icon">
        <img src="${openSidebarLogoUrl}" alt="" class="toolbar-logo" />
      </span>
      <span class="toolbar-label">Open</span>
    `,
    copy: `
      <span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="10" height="10" rx="2"></rect>
          <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
        </svg>
      </span>
      <span class="toolbar-label">Copy</span>
    `,
    explain: `
      <span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.2 1.1-1.2 2.2"></path>
          <path d="M12 17h.01"></path>
        </svg>
      </span>
      <span class="toolbar-label">Explain</span>
    `,
    translate: `
      <span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h10"></path>
          <path d="M9 6c0 6-2 10-5 12"></path>
          <path d="M7 11c1.4 1.7 3.1 3 5 4"></path>
          <path d="M14 7h6"></path>
          <path d="M17 5v2"></path>
          <path d="M14 19l3-8 3 8"></path>
          <path d="M15 16h4"></path>
        </svg>
      </span>
      <span class="toolbar-label">Translate</span>
    `,
    summarize: `
      <span class="toolbar-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12"></path>
          <path d="M6 12h12"></path>
          <path d="M6 17h7"></path>
        </svg>
      </span>
      <span class="toolbar-label">Summarize</span>
    `,
  };

  function createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "selection-toolbar hidden";
    toolbar.innerHTML = `
      <button type="button" class="open-sidebar-btn" title="Open ChatGPT Sidebar" aria-label="Open ChatGPT Sidebar">${TOOLBAR_ICONS.openSidebar}</button>
      <button type="button" class="copy-btn" title="Copy" aria-label="Copy selection">${TOOLBAR_ICONS.copy}</button>
      <button type="button" class="explain-btn" title="Explain" aria-label="Explain selection">${TOOLBAR_ICONS.explain}</button>
      <button type="button" class="translate-btn" title="Translate" aria-label="Translate selection">${TOOLBAR_ICONS.translate}</button>
      <button type="button" class="summarize-btn" title="Summarize" aria-label="Summarize selection">${TOOLBAR_ICONS.summarize}</button>
    `;
    document.body.appendChild(toolbar);
    return toolbar;
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

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
  }

  function showToolbarForSelection(selectionInfo) {
    if (!currentToolbar) {
      currentToolbar = createToolbar();
      setupToolbarListeners();
    }

    currentToolbar.style.display = "flex";
    currentToolbar.classList.remove("hidden");
    positionToolbar(currentToolbar, selectionInfo.rect);
    lastSelection = selectionInfo.text;
  }

  function hideToolbar() {
    if (!currentToolbar) {
      return;
    }

    currentToolbar.style.display = "none";
    currentToolbar.classList.add("hidden");
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

      sendRuntimeMessage({ type: "prompt-from-selection", prompt });
    });

    hideToolbar();
  }

  function setupToolbarListeners() {
    if (!currentToolbar) {
      return;
    }

    currentToolbar.querySelectorAll("button").forEach((button) => {
      button.addEventListener("mousedown", (event) => {
        // Preserve the current page selection while the toolbar button is pressed.
        event.preventDefault();
      });
    });

    currentToolbar
      .querySelector(".open-sidebar-btn")
      .addEventListener("click", () => handleAction("open-sidebar"));
    currentToolbar
      .querySelector(".copy-btn")
      .addEventListener("click", () => handleAction("copy"));
    currentToolbar
      .querySelector(".explain-btn")
      .addEventListener("click", () => handleAction("explain"));
    currentToolbar
      .querySelector(".translate-btn")
      .addEventListener("click", () => handleAction("translate"));
    currentToolbar
      .querySelector(".summarize-btn")
      .addEventListener("click", () => handleAction("summarize"));
  }

  function isSiteBlocked(callback) {
    chrome.storage.local.get("blockedSites", (data) => {
      const blocked = data.blockedSites || [];
      const currentHost = window.location.hostname;
      const blockedMatch = blocked.some(
        (site) => currentHost.includes(site) || site.includes(currentHost)
      );
      callback(blockedMatch);
    });
  }

  isSiteBlocked((blocked) => {
    if (blocked) {
      return;
    }

    document.addEventListener("mouseup", (event) => {
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
  });
})();
