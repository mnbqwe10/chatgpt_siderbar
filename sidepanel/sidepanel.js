const iframe = document.getElementById("chatgpt-iframe");
const statusBar = document.getElementById("status-bar");

const BRIDGE_MESSAGE_SOURCE = "chatgpt-sidebar-bridge";

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

function getChatGptOrigin() {
  return new URL(iframe.dataset.src || iframe.src).origin;
}

function pingBridge() {
  if (!iframe || !iframe.contentWindow) {
    return;
  }

  try {
    iframe.contentWindow.postMessage(
      {
        source: BRIDGE_MESSAGE_SOURCE,
        type: "bridge-ping",
      },
      getChatGptOrigin()
    );
  } catch (error) {
    // Ignore ping failures; waitForBridge will surface a real timeout if needed.
  }
}

iframe.addEventListener("load", () => {
  isIframeReady = true;
  isBridgeReady = false;
  setStatus("ChatGPT loaded, waiting for bridge...", "success");
  pingBridge();
});

iframe.addEventListener("error", () => {
  setStatus("Failed to load ChatGPT", "error");
});

window.addEventListener("message", (event) => {
  if (!iframe || event.source !== iframe.contentWindow) {
    return;
  }

  const message = event.data;
  if (!message || message.source !== BRIDGE_MESSAGE_SOURCE) {
    return;
  }

  if (message.type === "bridge-ready") {
    isBridgeReady = true;
    setStatus("ChatGPT bridge ready", "success");
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
        reject(new Error("ChatGPT bridge not ready yet"));
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
    const targetOrigin = getChatGptOrigin();

    return new Promise((resolve, reject) => {
      pendingBridgeRequests.set(requestId, { resolve, reject });

      try {
        targetWindow.postMessage(
          {
            source: BRIDGE_MESSAGE_SOURCE,
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

function relayPromptToChatGpt(messageType, promptText, successMessage) {
  if (!isIframeReady) {
    enqueuePrompt(promptText, successMessage);
    return;
  }

  promptRelayInFlight = true;
  setStatus("Sending prompt...");

  sendBridgeRequest(promptText)
    .then((response) => {
      if (!response || !response.ok) {
        setStatus(
          (response && response.error) || "ChatGPT composer not available",
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
    setStatus("Prompt queued, waiting for ChatGPT...", "success");
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
  relayPromptToChatGpt(
    "inject-chatgpt-prompt",
    nextPrompt.promptText,
    nextPrompt.successMessage
  );
}

if (iframe && iframe.dataset.src) {
  iframe.src = iframe.dataset.src;
}

chrome.runtime.sendMessage({ type: "sidepanel-ready" });
