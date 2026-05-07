const iframe = document.getElementById("chatbot-iframe");
const statusBar = document.getElementById("status-bar");
const platformName = document.getElementById("platform-name");

let currentPlatform = null;
let bridgeMessageSource = "";
let isIframeReady = false;
let isBridgeReady = false;
let nextRequestId = 0;
let promptRelayInFlight = false;
const pendingBridgeRequests = new Map();
const pendingPromptQueue = [];

function setStatus(msg, type = "") {
  statusBar.textContent = msg;
  statusBar.className = type ? type : "";
}

function setPlatformLabel(platform) {
  const label = platform && platform.label ? platform.label : "Chatbot";
  if (platformName) {
    platformName.textContent = label;
  }
  document.title = label + " Sidebar";
}

function getTargetOrigin() {
  if (currentPlatform) {
    return currentPlatform.origin;
  }
  try {
    return new URL(iframe.src).origin;
  } catch (e) {
    return "*";
  }
}

function pingBridge() {
  if (!iframe || !iframe.contentWindow) {
    return;
  }

  try {
    iframe.contentWindow.postMessage(
      {
        source: bridgeMessageSource,
        type: "bridge-ping",
      },
      getTargetOrigin()
    );
  } catch (error) {
    // Ignore ping failures; waitForBridge will surface a real timeout if needed.
  }
}

iframe.addEventListener("load", () => {
  isIframeReady = true;
  isBridgeReady = false;
  const label = currentPlatform ? currentPlatform.label : "Chatbot";
  setStatus(label + " loaded, waiting for bridge...", "success");
  pingBridge();
});

iframe.addEventListener("error", () => {
  const label = currentPlatform ? currentPlatform.label : "Chatbot";
  setStatus("Failed to load " + label, "error");
});

window.addEventListener("message", (event) => {
  if (!iframe || event.source !== iframe.contentWindow) {
    return;
  }

  const message = event.data;
  if (!message || message.source !== bridgeMessageSource) {
    return;
  }

  if (message.type === "bridge-ready") {
    isBridgeReady = true;
    const label = currentPlatform ? currentPlatform.label : "Chatbot";
    setStatus(label + " bridge ready", "success");
    flushPendingPrompts();
    return;
  }

  if (message.type !== "inject-result") {
    return;
  }

  const pending = pendingBridgeRequests.get(message.requestId);
  if (!pending) {
    return;
  }

  pendingBridgeRequests.delete(message.requestId);
  pending.resolve(message.result);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "queued-selection-prompts") {
    (message.prompts || []).forEach((prompt) => enqueuePrompt(prompt));
    sendResponse({ ok: true });
  }
});

function waitForBridge(timeoutMs = 5000) {
  if (isBridgeReady && iframe && iframe.contentWindow) {
    return Promise.resolve(iframe.contentWindow);
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    pingBridge();

    function poll() {
      if (isBridgeReady && iframe && iframe.contentWindow) {
        resolve(iframe.contentWindow);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        const label = currentPlatform ? currentPlatform.label : "Chatbot";
        reject(new Error(label + " bridge not ready yet"));
        return;
      }

      pingBridge();
      window.setTimeout(poll, 100);
    }

    poll();
  });
}

function sendBridgeRequest(promptText) {
  return waitForBridge().then((targetWindow) => {
    const requestId = `req-${Date.now()}-${nextRequestId++}`;
    const targetOrigin = getTargetOrigin();

    return new Promise((resolve, reject) => {
      pendingBridgeRequests.set(requestId, { resolve, reject });

      try {
        targetWindow.postMessage(
          {
            source: bridgeMessageSource,
            type: "inject-prompt",
            requestId,
            promptText,
          },
          targetOrigin
        );
      } catch (error) {
        pendingBridgeRequests.delete(requestId);
        reject(error);
      }
    });
  });
}

function relayPrompt(promptText, successMessage) {
  if (!isIframeReady) {
    enqueuePrompt(promptText, successMessage);
    return;
  }

  promptRelayInFlight = true;
  setStatus("Sending prompt...");

  sendBridgeRequest(promptText)
    .then((response) => {
      if (!response || !response.ok) {
        const label = currentPlatform ? currentPlatform.label : "Chatbot";
        setStatus(
          (response && response.error) || label + " composer not available",
          "error"
        );
        return;
      }

      setStatus(successMessage, "success");
    })
    .catch((error) => {
      setStatus("Prompt injection failed: " + error.message, "error");
    })
    .finally(() => {
      promptRelayInFlight = false;
      flushPendingPrompts();
    });
}

function enqueuePrompt(promptText, successMessage = "Prompt sent") {
  if (!promptText) {
    return;
  }

  pendingPromptQueue.push({ promptText, successMessage });

  if (!isIframeReady || !isBridgeReady) {
    const label = currentPlatform ? currentPlatform.label : "Chatbot";
    setStatus("Prompt queued, waiting for " + label + "...", "success");
    return;
  }

  flushPendingPrompts();
}

function flushPendingPrompts() {
  if (
    promptRelayInFlight ||
    !isIframeReady ||
    !isBridgeReady ||
    pendingPromptQueue.length === 0
  ) {
    return;
  }

  const nextPrompt = pendingPromptQueue.shift();
  relayPrompt(nextPrompt.promptText, nextPrompt.successMessage);
}

function initPlatform(platform) {
  currentPlatform = platform;
  bridgeMessageSource = platform.bridgeSource;
  isIframeReady = false;
  isBridgeReady = false;
  setPlatformLabel(platform);
  setStatus("Loading " + platform.label + "...");
  iframe.src = platform.url;
}

getSelectedPlatform().then((platform) => {
  initPlatform(platform);
  chrome.runtime.sendMessage({ type: "sidepanel-ready" });
});

// Listen for platform changes while sidepanel is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes[PLATFORM_STORAGE_KEY]) {
    const newPlatformId = changes[PLATFORM_STORAGE_KEY].newValue || DEFAULT_PLATFORM;
    const newPlatform = getPlatformConfig(newPlatformId);
    if (!currentPlatform || currentPlatform.id !== newPlatform.id) {
      initPlatform(newPlatform);
    }
  }
});
