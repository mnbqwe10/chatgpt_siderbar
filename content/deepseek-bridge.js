(function () {
  const BRIDGE_MESSAGE_SOURCE = "deepseek-sidebar-bridge";

  function findComposer(doc = document) {
    return (
      doc.querySelector("#chat-input") ||
      doc.querySelector("textarea[placeholder]") ||
      doc.querySelector("[role='textbox']") ||
      doc.querySelector("textarea") ||
      doc.querySelector("[contenteditable='true']")
    );
  }

  function findSendButton(doc = document) {
    const directMatch =
      doc.querySelector("button[data-testid='send-button']") ||
      doc.querySelector("div[role='button'][aria-disabled='false']._7436101");
    if (directMatch && !directMatch.disabled) {
      return directMatch;
    }

    const buttons = Array.from(doc.querySelectorAll("button, div[role='button']"));
    return (
      buttons.find((button) => {
        if (button.disabled || button.getAttribute("aria-disabled") === "true") {
          return false;
        }
        const label = (
          button.getAttribute("aria-label") ||
          button.textContent ||
          ""
        )
          .trim()
          .toLowerCase();
        return (
          label === "send" ||
          label === "send message" ||
          label === "submit"
        );
      }) || null
    );
  }

  function dispatchInputEvent(target, win = window) {
    if (typeof win.InputEvent === "function") {
      target.dispatchEvent(
        new win.InputEvent("input", {
          bubbles: true,
          data: null,
          inputType: "insertText",
        })
      );
      return;
    }
    target.dispatchEvent(new win.Event("input", { bubbles: true }));
  }

  function setComposerText(composer, text, doc = document, win = window) {
    if (!composer) {
      return false;
    }
    if (typeof composer.focus === "function") {
      composer.focus();
    }

    if ("value" in composer) {
      const prototype =
        composer.tagName === "TEXTAREA"
          ? win.HTMLTextAreaElement && win.HTMLTextAreaElement.prototype
          : win.HTMLInputElement && win.HTMLInputElement.prototype;
      const valueSetter =
        prototype && Object.getOwnPropertyDescriptor(prototype, "value")
          ? Object.getOwnPropertyDescriptor(prototype, "value").set
          : null;
      if (valueSetter) {
        valueSetter.call(composer, text);
      } else {
        composer.value = text;
      }
      dispatchInputEvent(composer, win);
      return true;
    }

    if (!composer.isContentEditable) {
      return false;
    }

    if (typeof composer.textContent === "string") {
      composer.textContent = "";
    }

    const selection = win.getSelection ? win.getSelection() : null;
    if (selection && doc.createRange) {
      const range = doc.createRange();
      range.selectNodeContents(composer);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const inserted =
      typeof doc.execCommand === "function"
        ? doc.execCommand("insertText", false, text)
        : false;
    if (!inserted) {
      composer.textContent = text;
    }
    dispatchInputEvent(composer, win);
    return true;
  }

  function clearComposer(composer, doc = document, win = window) {
    if (!composer) {
      return;
    }
    if ("value" in composer) {
      const prototype =
        composer.tagName === "TEXTAREA"
          ? win.HTMLTextAreaElement && win.HTMLTextAreaElement.prototype
          : win.HTMLInputElement && win.HTMLInputElement.prototype;
      const valueSetter =
        prototype && Object.getOwnPropertyDescriptor(prototype, "value")
          ? Object.getOwnPropertyDescriptor(prototype, "value").set
          : null;
      if (valueSetter) {
        valueSetter.call(composer, "");
      } else {
        composer.value = "";
      }
      dispatchInputEvent(composer, win);
    } else if (composer.isContentEditable) {
      composer.textContent = "";
      dispatchInputEvent(composer, win);
    }
  }

  function getComposerText(composer) {
    if (!composer) {
      return "";
    }
    if ("value" in composer && typeof composer.value === "string") {
      return composer.value;
    }
    if (typeof composer.textContent === "string") {
      return composer.textContent;
    }
    return "";
  }

  function scheduleDraftClear(composer, submittedText, doc = document, win = window) {
    if (!submittedText) {
      return;
    }

    win.setTimeout(() => {
      const currentText = getComposerText(composer).trim();
      // Clear only if the exact submitted text is still present.
      if (currentText && currentText === submittedText.trim()) {
        clearComposer(composer, doc, win);
      }
    }, 1200);
  }

  function submitComposer(composer, promptText, doc = document, win = window) {
    const sendButton = findSendButton(doc);
    if (sendButton) {
      sendButton.click();
      scheduleDraftClear(composer, promptText, doc, win);
      return true;
    }
    if (typeof win.KeyboardEvent !== "function") {
      return false;
    }
    const result = composer.dispatchEvent(
      new win.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
      })
    );
    scheduleDraftClear(composer, promptText, doc, win);
    return result;
  }

  function injectPromptIntoDocument(promptText, doc = document, win = window) {
    const composer = findComposer(doc);
    if (!composer) {
      return { ok: false, error: "DeepSeek composer not found" };
    }
    if (!setComposerText(composer, promptText, doc, win)) {
      return { ok: false, error: "Unable to populate DeepSeek composer" };
    }
    if (!submitComposer(composer, promptText, doc, win)) {
      return { ok: false, error: "Unable to submit DeepSeek prompt" };
    }
    return { ok: true };
  }

  function injectPromptWithRetry(promptText, sendResponse) {
    let attempts = 0;
    const maxAttempts = 20;

    function tryInject() {
      const result = injectPromptIntoDocument(promptText);
      if (result.ok || attempts >= maxAttempts) {
        sendResponse(result);
        return;
      }
      attempts += 1;
      window.setTimeout(tryInject, 250);
    }
    tryInject();
  }

  function setupMessageBridge() {
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) {
        return;
      }
      const message = event.data;
      if (!message || message.source !== BRIDGE_MESSAGE_SOURCE) {
        return;
      }

      if (message.type === "bridge-ping") {
        window.parent.postMessage(
          { source: BRIDGE_MESSAGE_SOURCE, type: "bridge-ready" },
          "*"
        );
        return;
      }

      if (message.type !== "inject-prompt") {
        return;
      }

      injectPromptWithRetry(message.promptText, (result) => {
        window.parent.postMessage(
          {
            source: BRIDGE_MESSAGE_SOURCE,
            type: "inject-result",
            requestId: message.requestId,
            result,
          },
          "*"
        );
      });
    });

    window.parent.postMessage(
      { source: BRIDGE_MESSAGE_SOURCE, type: "bridge-ready" },
      "*"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupMessageBridge);
  } else {
    setupMessageBridge();
  }
})();
