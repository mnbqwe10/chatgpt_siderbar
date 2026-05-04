const { expandPrompt } = require("./prompt-engine");

describe("expandPrompt", () => {
  test("expands {{selected_text}} placeholder", () => {
    const result = expandPrompt("Explain: {{selected_text}}", {
      selectedText: "hello world",
      pageUrl: "",
      pageTitle: "",
    });
    expect(result).toBe("Explain: hello world");
  });

  test("expands {{page_url}} placeholder", () => {
    const result = expandPrompt("Page: {{page_url}}", {
      selectedText: "",
      pageUrl: "https://example.com/article",
      pageTitle: "",
    });
    expect(result).toBe("Page: https://example.com/article");
  });

  test("expands {{page_title}} placeholder", () => {
    const result = expandPrompt("Title: {{page_title}}", {
      selectedText: "",
      pageUrl: "",
      pageTitle: "My Article",
    });
    expect(result).toBe("Title: My Article");
  });

  test("expands {{target_language}} placeholder", () => {
    const result = expandPrompt("Translate to {{target_language}}", {
      selectedText: "",
      pageUrl: "",
      pageTitle: "",
      targetLanguage: "Japanese",
    });
    expect(result).toBe("Translate to Japanese");
  });

  test("expands all placeholders together", () => {
    const result = expandPrompt(
      "Explain \"{{selected_text}}\" from \"{{page_title}}\" ({{page_url}})",
      {
        selectedText: "photosynthesis",
        pageUrl: "https://wiki.org/photosynthesis",
        pageTitle: "Photosynthesis - Wikipedia",
      }
    );
    expect(result).toBe(
      "Explain \"photosynthesis\" from \"Photosynthesis - Wikipedia\" (https://wiki.org/photosynthesis)"
    );
  });

  test("unknown variables are left as-is", () => {
    const result = expandPrompt("{{unknown_var}}", {
      selectedText: "",
      pageUrl: "",
      pageTitle: "",
    });
    expect(result).toBe("{{unknown_var}}");
  });

  test("template with no variables returns as-is", () => {
    const result = expandPrompt("Just static text", {
      selectedText: "anything",
      pageUrl: "https://example.com",
      pageTitle: "Example",
    });
    expect(result).toBe("Just static text");
  });

  test("empty template returns empty string", () => {
    const result = expandPrompt("", {
      selectedText: "something",
      pageUrl: "https://example.com",
      pageTitle: "Example",
    });
    expect(result).toBe("");
  });

  test("multiple occurrences of same variable are all replaced", () => {
    const result = expandPrompt("{{selected_text}} and {{selected_text}}", {
      selectedText: "repeated",
      pageUrl: "",
      pageTitle: "",
    });
    expect(result).toBe("repeated and repeated");
  });
});
