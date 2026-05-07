(function () {
  const BRIDGE_MESSAGE_SOURCE = "gemini-sidebar-bridge";

  function findComposer(doc = document) {
    return (
      doc.querySelector(".ql-editor[contenteditable='true']") ||
      doc.querySelector("rich-textarea .ql-editor") ||
      doc.querySelector("[aria-label='Enter a prompt here']") ||
      doc.querySelector(".text-input-field_textarea") ||
      doc.querySelector("[contenteditable='true']") ||
      doc.querySelector("textarea")
    );
  }

  function findSendButton(doc = document) {
    const ariaMatch =
      doc.querySelector("button[aria-label='Send message']") ||
      doc.querySelector("button.send-button") ||
      doc.querySelector("[data-mat-icon-name='send']");
    if (ariaMatch && !ariaMatch.disabled) {
      return ariaMatch.closest("button") || ariaMatch;
    }

    const buttons = Array.from(doc.querySelectorAll("button, mat-icon-button"));
    return (
      buttons.find((button) => {
        if (button.disabled) {
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

  function pressEnterKey(composer, win = window) {
    if (typeof win.KeyboardEvent !== "function") {
      return false;
    }
    ["keydown", "keypress", "keyup"].forEach((type) => {
      composer.dispatchEvent(
        new win.KeyboardEvent(type, {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
        })
      );
    });
    return true;
  }

  function submitComposer(composer, doc = document, win = window) {
    const sendButton = findSendButton(doc);
    if (sendButton) {
      sendButton.click();
      return true;
    }
    return pressEnterKey(composer, win);
  }

  function injectPromptIntoDocument(promptText, doc = document, win = window) {
    const composer = findComposer(doc);
    if (!composer) {
      return { ok: false, error: "Gemini composer not found" };
    }
    if (!setComposerText(composer, promptText, doc, win)) {
      return { ok: false, error: "Unable to populate Gemini composer" };
    }
    return { ok: true, pendingSubmit: true };
  }

  function submitWithRetry(doc, win, maxAttempts, attempt) {
    const composer = findComposer(doc);
    if (!composer) {
      return;
    }
    const sendButton = findSendButton(doc);
    if (sendButton) {
      sendButton.click();
      return;
    }
    if (attempt >= maxAttempts) {
      pressEnterKey(composer, win);
      return;
    }
    win.setTimeout(() => submitWithRetry(doc, win, maxAttempts, attempt + 1), 200);
  }

  function injectPromptWithRetry(promptText, sendResponse) {
    let attempts = 0;
    const maxAttempts = 20;

    function tryInject() {
      const result = injectPromptIntoDocument(promptText);
      if (result.ok) {
        // Text is in composer; schedule submit with delay so Gemini detects input
        window.setTimeout(() => submitWithRetry(document, window, 10, 0), 300);
        sendResponse({ ok: true });
        return;
      }
      if (attempts >= maxAttempts) {
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
