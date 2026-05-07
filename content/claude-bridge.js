(function () {
  const BRIDGE_MESSAGE_SOURCE = "claude-sidebar-bridge";

  function findComposer(doc = document) {
    return (
      doc.querySelector("[contenteditable='true'].ProseMirror") ||
      doc.querySelector("div[contenteditable='true'][translate='no']") ||
      doc.querySelector(".ProseMirror[contenteditable='true']") ||
      doc.querySelector("[contenteditable='true']") ||
      doc.querySelector("textarea")
    );
  }

  function findSendButton(doc = document) {
    const ariaMatch =
      doc.querySelector("button[aria-label='Send Message']") ||
      doc.querySelector("button[aria-label='Send message']") ||
      doc.querySelector("button[aria-label='Send']");
    if (ariaMatch && !ariaMatch.disabled) {
      return ariaMatch;
    }

    const buttons = Array.from(doc.querySelectorAll("button"));
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

  function submitComposer(composer, doc = document, win = window) {
    const sendButton = findSendButton(doc);
    if (sendButton) {
      sendButton.click();
      return true;
    }
    if (typeof win.KeyboardEvent !== "function") {
      return false;
    }
    return composer.dispatchEvent(
      new win.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
      })
    );
  }

  function injectPromptIntoDocument(promptText, doc = document, win = window) {
    const composer = findComposer(doc);
    if (!composer) {
      return { ok: false, error: "Claude composer not found" };
    }
    if (!setComposerText(composer, promptText, doc, win)) {
      return { ok: false, error: "Unable to populate Claude composer" };
    }
    if (!submitComposer(composer, doc, win)) {
      return { ok: false, error: "Unable to submit Claude prompt" };
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
