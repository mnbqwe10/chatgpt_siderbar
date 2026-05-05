(function (globalScope) {
  function buildAskPrompt(question, selectedText, context = {}) {
    return `User question or prompt:\n${question}\n\nSelected text:\n"${selectedText}"\n\nPage title: ${context.pageTitle || ""}\nPage URL: ${context.pageUrl || ""}`;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildAskPrompt };
  }

  if (globalScope) {
    globalScope.buildAskPrompt = buildAskPrompt;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
