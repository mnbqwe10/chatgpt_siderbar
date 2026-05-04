const test = require("node:test");
const assert = require("node:assert/strict");

const {
  injectPromptIntoDocument,
} = require("./chatgpt-bridge");

function createWindowStub() {
  class Event {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = !!init.bubbles;
      this.cancelable = !!init.cancelable;
    }
  }

  class InputEvent extends Event {
    constructor(type, init = {}) {
      super(type, init);
      this.data = init.data;
      this.inputType = init.inputType;
    }
  }

  class KeyboardEvent extends Event {
    constructor(type, init = {}) {
      super(type, init);
      this.key = init.key;
      this.code = init.code;
      this.keyCode = init.keyCode;
      this.which = init.which;
    }
  }

  return {
    Event,
    InputEvent,
    KeyboardEvent,
    HTMLTextAreaElement: { prototype: {} },
    HTMLInputElement: { prototype: {} },
    getSelection() {
      return null;
    },
  };
}

function createDocumentStub({ composer, sendButton }) {
  return {
    querySelector(selector) {
      if (
        selector === "#prompt-textarea" ||
        selector === "[data-placeholder='Ask anything']" ||
        selector === "textarea" ||
        selector === ".ProseMirror" ||
        selector === "[contenteditable='true']"
      ) {
        return composer;
      }

      if (selector === "button[data-testid='send-button']") {
        return sendButton;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === "button") {
        return sendButton ? [sendButton] : [];
      }

      return [];
    },
    execCommand() {
      return false;
    },
    createRange() {
      return {
        selectNodeContents() {},
        collapse() {},
      };
    },
  };
}

test("injectPromptIntoDocument fills a textarea composer and clicks send", () => {
  const composer = {
    tagName: "TEXTAREA",
    value: "",
    disabled: false,
    focusCalled: false,
    events: [],
    focus() {
      this.focusCalled = true;
    },
    dispatchEvent(event) {
      this.events.push(event.type);
      return true;
    },
  };
  const sendButton = {
    disabled: false,
    clicked: false,
    textContent: "Send",
    getAttribute() {
      return null;
    },
    click() {
      this.clicked = true;
    },
  };
  const win = createWindowStub();
  const doc = createDocumentStub({ composer, sendButton });

  const result = injectPromptIntoDocument("Explain this selection", doc, win);

  assert.deepEqual(result, { ok: true });
  assert.equal(composer.focusCalled, true);
  assert.equal(composer.value, "Explain this selection");
  assert.deepEqual(composer.events, ["input"]);
  assert.equal(sendButton.clicked, true);
});

test("injectPromptIntoDocument reports a missing composer", () => {
  const win = createWindowStub();
  const doc = createDocumentStub({ composer: null, sendButton: null });

  const result = injectPromptIntoDocument("Explain this selection", doc, win);

  assert.deepEqual(result, {
    ok: false,
    error: "ChatGPT composer not found",
  });
});

test("injectPromptIntoDocument falls back to send hotkey when no send button exists", () => {
  const composer = {
    tagName: "TEXTAREA",
    value: "",
    disabled: false,
    events: [],
    focus() {},
    dispatchEvent(event) {
      this.events.push(event.type);
      return true;
    },
  };
  const win = createWindowStub();
  const doc = createDocumentStub({ composer, sendButton: null });

  const result = injectPromptIntoDocument("Explain this selection", doc, win);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(composer.events, ["input", "keydown"]);
});
