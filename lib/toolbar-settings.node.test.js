const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TOOLBAR_LABEL_MODE_ICON_ONLY,
  getDefaultToolbarSettings,
  normalizeToolbarSettings,
} = require("./toolbar-settings");

test("normalizeToolbarSettings preserves custom order and visibility", () => {
  const settings = normalizeToolbarSettings({
    buttonOrder: ["ask", "copy"],
    visible: {
      explain: false,
      translate: false,
    },
    labelMode: TOOLBAR_LABEL_MODE_ICON_ONLY,
  });

  assert.deepEqual(settings.buttonOrder.slice(0, 2), ["ask", "copy"]);
  assert.equal(settings.visible.explain, false);
  assert.equal(settings.visible.translate, false);
  assert.equal(settings.labelMode, TOOLBAR_LABEL_MODE_ICON_ONLY);
});

test("normalizeToolbarSettings keeps at least one toolbar action visible", () => {
  const defaults = getDefaultToolbarSettings();
  const settings = normalizeToolbarSettings({
    visible: Object.fromEntries(
      Object.keys(defaults.visible).map((key) => [key, false])
    ),
  });

  assert.equal(settings.visible.openSidebar, true);
});
