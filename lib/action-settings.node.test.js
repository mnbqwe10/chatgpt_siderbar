const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDefaultActionSettings,
  normalizeActionSettings,
} = require("./action-settings");
const { expandPrompt } = require("./prompt-engine");

test("normalizeActionSettings merges overrides with defaults", () => {
  const settings = normalizeActionSettings({
    explain: {
      template: "Explain: {{selected_text}}",
    },
    translate: {
      targetLanguage: "Spanish",
    },
  });

  assert.equal(settings.explain.template, "Explain: {{selected_text}}");
  assert.equal(settings.translate.targetLanguage, "Spanish");
  assert.match(settings.summarize.template, /Summarize the following text/);
});

test("getDefaultActionSettings returns a fresh copy", () => {
  const first = getDefaultActionSettings();
  const second = getDefaultActionSettings();

  first.translate.targetLanguage = "German";

  assert.equal(second.translate.targetLanguage, "English");
});

test("expandPrompt fills the target language placeholder", () => {
  const prompt = expandPrompt("Translate to {{target_language}}", {
    selectedText: "hola",
    targetLanguage: "French",
  });

  assert.equal(prompt, "Translate to French");
});
