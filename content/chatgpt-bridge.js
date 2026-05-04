(function () {
  const BRIDGE_MESSAGE_SOURCE = "chatgpt-sidebar-bridge";

  function findComposer(doc = document) {
    return (
      doc.querySelector("#prompt-textarea") ||
      doc.querySelector("[data-placeholder='Ask anything']") ||
      doc.querySelector("textarea") ||
      doc.querySelector(".ProseMirror") ||
      doc.querySelector("[contenteditable='true']")
    );
  }

  function findSendButton(doc = document) {
    const directMatch = doc.querySelector("button[data-testid='send-button']");
    if (directMatch && !directMatch.disabled) {
      return directMatch;
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
          label === "send prompt" ||
          label === "send message"
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
      return { ok: false, error: "ChatGPT composer not found" };
    }

    if (!setComposerText(composer, promptText, doc, win)) {
      return { ok: false, error: "Unable to populate ChatGPT composer" };
    }

    if (!submitComposer(composer, doc, win)) {
      return { ok: false, error: "Unable to submit ChatGPT prompt" };
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
          {
            source: BRIDGE_MESSAGE_SOURCE,
            type: "bridge-ready",
          },
          "*"
        );
        return;
      }

      if (message.type !== "inject-prompt") {
        return;
      }

      injectPromptWithRetry(message.promptText, (result) => {
        window.parent.postMessage({
          source: BRIDGE_MESSAGE_SOURCE,
          type: "inject-result",
          requestId: message.requestId,
          result,
        }, "*");
      });
    });

    window.parent.postMessage(
      {
        source: BRIDGE_MESSAGE_SOURCE,
        type: "bridge-ready",
      },
      "*"
    );
  }

  function isEmbeddedSidebarFrame(win = window) {
    if (win.top === win) {
      return false;
    }

    return true;
  }

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    isEmbeddedSidebarFrame()
  ) {
    setupMessageBridge();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      dispatchInputEvent,
      findComposer,
      findSendButton,
      injectPromptIntoDocument,
      setComposerText,
      submitComposer,
    };
  }
})();
