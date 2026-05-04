function expandPrompt(template, context) {
  if (!template) return "";
  return template
    .replace(/\{\{selected_text\}\}/g, context.selectedText || "")
    .replace(/\{\{page_url\}\}/g, context.pageUrl || "")
    .replace(/\{\{page_title\}\}/g, context.pageTitle || "")
    .replace(/\{\{target_language\}\}/g, context.targetLanguage || "");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { expandPrompt };
}
