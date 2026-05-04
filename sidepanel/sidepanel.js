const iframe = document.getElementById("chatgpt-iframe");
const statusBar = document.getElementById("status-bar");
const screenshotBtn = document.getElementById("screenshot-btn");

const BRIDGE_PORT_NAME = "chatgpt-bridge";

let isIframeReady = false;
let bridgePort = null;
let nextRequestId = 0;
const pendingBridgeRequests = new Map();

if (iframe && iframe.dataset.src) {
  iframe.src = iframe.dataset.src;
}

function setStatus(msg, type = "") {
  statusBar.textContent = msg;
  statusBar.className = type ? type : "";
}

iframe.addEventListener("load", () => {
  isIframeReady = true;
  setStatus("ChatGPT loaded, waiting for bridge...", "success");
});

iframe.addEventListener("error", () => {
  setStatus("Failed to load ChatGPT", "error");
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== BRIDGE_PORT_NAME) {
    return;
  }

  bridgePort = port;
  setStatus("ChatGPT bridge ready", "success");

  port.onMessage.addListener((message) => {
    if (!message || message.type !== "inject-result") {
      return;
    }

    const pending = pendingBridgeRequests.get(message.requestId);
    if (!pending) {
      return;
    }

    pendingBridgeRequests.delete(message.requestId);
    pending.resolve(message.result);
  });

  port.onDisconnect.addListener(() => {
    if (bridgePort === port) {
      bridgePort = null;
    }

    for (const pending of pendingBridgeRequests.values()) {
      pending.reject(new Error("ChatGPT bridge disconnected"));
    }
    pendingBridgeRequests.clear();
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "prompt-from-selection") {
    relayPromptToChatGpt("inject-chatgpt-prompt", message.prompt, "Prompt sent");
  } else if (message.type === "screenshot") {
    captureAndSend(message.dataUrl);
  }
});

function waitForBridge(timeoutMs = 5000) {
  if (bridgePort) {
    return Promise.resolve(bridgePort);
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();

    function poll() {
      if (bridgePort) {
        resolve(bridgePort);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        reject(new Error("ChatGPT bridge not ready yet"));
        return;
      }

      window.setTimeout(poll, 100);
    }

    poll();
  });
}

function sendBridgeRequest(promptText) {
  return waitForBridge().then((port) => {
    const requestId = `req-${Date.now()}-${nextRequestId++}`;

    return new Promise((resolve, reject) => {
      pendingBridgeRequests.set(requestId, { resolve, reject });

      try {
        port.postMessage({
          type: "inject-prompt",
          requestId,
          promptText,
        });
      } catch (error) {
        pendingBridgeRequests.delete(requestId);
        reject(error);
      }
    });
  });
}

function relayPromptToChatGpt(messageType, promptText, successMessage) {
  if (!isIframeReady) {
    setStatus("ChatGPT not ready yet", "error");
    return;
  }

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
    });
}

async function captureAndSend(dataUrl) {
  if (!isIframeReady) {
    setStatus("ChatGPT not ready", "error");
    return;
  }
  if (!dataUrl) {
    setStatus("No screenshot data", "error");
    return;
  }

  relayPromptToChatGpt(
    "inject-chatgpt-screenshot",
    `What do you see in this screenshot? ![screenshot](${dataUrl})`,
    "Screenshot sent"
  );
}

screenshotBtn.addEventListener("click", async () => {
  setStatus("Capturing...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.captureTab(tab.id, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        setStatus("Capture failed: " + chrome.runtime.lastError.message, "error");
        return;
      }
      captureAndSend(dataUrl);
    });
  } catch (e) {
    setStatus("Screenshot failed: " + e.message, "error");
  }
});
