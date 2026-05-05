const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAskPrompt } = require("./ask-prompt");

test("buildAskPrompt combines the user question with the selected text", () => {
  const prompt = buildAskPrompt("What does this imply?", "Revenue grew 18%", {
    pageTitle: "Quarterly report",
    pageUrl: "https://example.com/report",
  });

  assert.equal(
    prompt,
    'User question or prompt:\nWhat does this imply?\n\nSelected text:\n"Revenue grew 18%"\n\nPage title: Quarterly report\nPage URL: https://example.com/report'
  );
});
