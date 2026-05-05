chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "content-security-policy", operation: "remove" },
            { header: "x-frame-options", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "https://chatgpt.com/*",
          resourceTypes: ["main_frame", "sub_frame"]
        }
      }
    ],
    removeRuleIds: [1]
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }
});

const pendingSelectionPrompts = [];
let promptDeliveryInFlight = false;
let promptDeliveryRequestedDuringInFlight = false;

function openSidebarForSender(sender) {
  const windowId =
    sender && sender.tab && typeof sender.tab.windowId === "number"
      ? sender.tab.windowId
      : chrome.windows.WINDOW_ID_CURRENT;

  try {
    const maybePromise = chrome.sidePanel.open({ windowId });
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch((error) => {
        console.error("[ChatGPT Sidebar] side panel open failed:", error);
      });
    }
  } catch (error) {
    console.error("[ChatGPT Sidebar] side panel open failed:", error);
  }
}

function deliverPendingSelectionPrompts() {
  if (promptDeliveryInFlight || pendingSelectionPrompts.length === 0) {
    if (promptDeliveryInFlight) {
      promptDeliveryRequestedDuringInFlight = true;
    }
    return;
  }

  const prompts = pendingSelectionPrompts.slice();
  promptDeliveryInFlight = true;
  promptDeliveryRequestedDuringInFlight = false;

  chrome.runtime.sendMessage(
    { type: "queued-selection-prompts", prompts },
    (response) => {
      promptDeliveryInFlight = false;

      if (chrome.runtime.lastError || !response || !response.ok) {
        if (promptDeliveryRequestedDuringInFlight) {
          deliverPendingSelectionPrompts();
        }
        return;
      }

      pendingSelectionPrompts.splice(0, prompts.length);
      deliverPendingSelectionPrompts();
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "open-sidebar") {
    openSidebarForSender(sender);
    deliverPendingSelectionPrompts();
    return;
  }

  if (message.type === "selection-prompt-request") {
    if (message.prompt) {
      pendingSelectionPrompts.push(message.prompt);
    }

    openSidebarForSender(sender);
    deliverPendingSelectionPrompts();
    return;
  }

  if (message.type === "sidepanel-ready") {
    deliverPendingSelectionPrompts();
  }
});
