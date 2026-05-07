const extensionEnabledInput = document.getElementById("extension-enabled");
const platformSelectInput = document.getElementById("platform-select");
const brandTitle = document.getElementById("brand-title");
const targetLanguageInput = document.getElementById("target-language");
const labelModeInput = document.getElementById("label-mode");
const toolbarActionsList = document.getElementById("toolbar-actions-list");
const openSidebarBtn = document.getElementById("open-sidebar-btn");

let currentToolbarSettings = getDefaultToolbarSettings();
let draggedActionKey = null;

function populatePlatformOptions(selectedPlatformId) {
  platformSelectInput.innerHTML = "";
  getAllPlatforms().forEach((platform) => {
    const option = document.createElement("option");
    option.value = platform.id;
    option.textContent = platform.label;
    platformSelectInput.appendChild(option);
  });
  platformSelectInput.value = selectedPlatformId || DEFAULT_PLATFORM;
  updateBrandTitle(selectedPlatformId);
}

function updateBrandTitle(platformId) {
  const platform = getPlatformConfig(platformId || DEFAULT_PLATFORM);
  brandTitle.textContent = platform.label;
}

function populateTranslateLanguageOptions(selectedLanguage) {
  const languages = [...TRANSLATE_LANGUAGES];
  if (
    selectedLanguage &&
    !languages.some((language) => language.value === selectedLanguage)
  ) {
    languages.push({ value: selectedLanguage, label: selectedLanguage });
  }

  targetLanguageInput.innerHTML = "";
  languages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.value;
    option.textContent = language.label;
    option.title = language.value;
    targetLanguageInput.appendChild(option);
  });
  targetLanguageInput.value = selectedLanguage || "English";
}

function renderEnabledState(enabled) {
  extensionEnabledInput.checked = enabled;
}

function saveToolbarSettings(settings) {
  currentToolbarSettings = normalizeToolbarSettings(settings);
  chrome.storage.local.set({
    [TOOLBAR_SETTINGS_STORAGE_KEY]: currentToolbarSettings,
  });
  renderToolbarActions();
}

function reorderAction(draggedKey, targetKey) {
  const order = [...currentToolbarSettings.buttonOrder];
  const fromIndex = order.indexOf(draggedKey);
  const toIndex = order.indexOf(targetKey);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return;
  }

  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, draggedKey);
  saveToolbarSettings({ ...currentToolbarSettings, buttonOrder: order });
}

function setActionVisible(actionKey, visible) {
  saveToolbarSettings({
    ...currentToolbarSettings,
    visible: {
      ...currentToolbarSettings.visible,
      [actionKey]: visible,
    },
  });
}

function renderToolbarActions() {
  const visibleCount = currentToolbarSettings.buttonOrder.filter(
    (key) => currentToolbarSettings.visible[key]
  ).length;

  toolbarActionsList.innerHTML = "";

  currentToolbarSettings.buttonOrder.forEach((key, index) => {
    const action = getToolbarActionByKey(key);
    if (!action) {
      return;
    }

    const row = document.createElement("div");
    row.className = "toolbar-action-row";
    row.draggable = true;
    row.dataset.actionKey = key;
    row.addEventListener("dragstart", (event) => {
      draggedActionKey = key;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    });
    row.addEventListener("dragend", () => {
      draggedActionKey = null;
      row.classList.remove("dragging");
      toolbarActionsList
        .querySelectorAll(".drag-over")
        .forEach((element) => element.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", (event) => {
      if (!draggedActionKey || draggedActionKey === key) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drag-over");
      reorderAction(
        draggedActionKey || event.dataTransfer.getData("text/plain"),
        key
      );
    });

    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.textContent = "::";
    dragHandle.setAttribute("aria-hidden", "true");

    const label = document.createElement("label");
    label.className = "action-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "switch-input";
    checkbox.checked = currentToolbarSettings.visible[key];
    checkbox.disabled = checkbox.checked && visibleCount === 1;
    checkbox.addEventListener("change", () => {
      setActionVisible(key, checkbox.checked);
    });
    const switchTrack = document.createElement("span");
    switchTrack.className = "switch-track";
    switchTrack.setAttribute("aria-hidden", "true");
    label.appendChild(checkbox);
    label.appendChild(switchTrack);
    label.appendChild(document.createTextNode(action.label));

    row.append(dragHandle, label);
    toolbarActionsList.appendChild(row);
  });

  labelModeInput.value = currentToolbarSettings.labelMode;
}

function loadPopupSettings() {
  chrome.storage.local.get(
    [
      SELECTION_TOOLBAR_ENABLED_STORAGE_KEY,
      ACTION_SETTINGS_STORAGE_KEY,
      TOOLBAR_SETTINGS_STORAGE_KEY,
      PLATFORM_STORAGE_KEY,
    ],
    (data) => {
      renderEnabledState(
        data[SELECTION_TOOLBAR_ENABLED_STORAGE_KEY] !== false
      );

      populatePlatformOptions(data[PLATFORM_STORAGE_KEY]);

      const actionSettings = normalizeActionSettings(
        data[ACTION_SETTINGS_STORAGE_KEY]
      );
      populateTranslateLanguageOptions(actionSettings.translate.targetLanguage);

      currentToolbarSettings = normalizeToolbarSettings(
        data[TOOLBAR_SETTINGS_STORAGE_KEY]
      );
      renderToolbarActions();
    }
  );
}

extensionEnabledInput.addEventListener("change", () => {
  chrome.storage.local.set({
    [SELECTION_TOOLBAR_ENABLED_STORAGE_KEY]: extensionEnabledInput.checked,
  });
  renderEnabledState(extensionEnabledInput.checked);
});

platformSelectInput.addEventListener("change", () => {
  setSelectedPlatform(platformSelectInput.value);
  updateBrandTitle(platformSelectInput.value);
});

targetLanguageInput.addEventListener("change", () => {
  chrome.storage.local.get(ACTION_SETTINGS_STORAGE_KEY, (data) => {
    const actionSettings = normalizeActionSettings(
      data[ACTION_SETTINGS_STORAGE_KEY]
    );
    actionSettings.translate.targetLanguage = targetLanguageInput.value;
    chrome.storage.local.set({ [ACTION_SETTINGS_STORAGE_KEY]: actionSettings });
  });
});

labelModeInput.addEventListener("change", () => {
  saveToolbarSettings({
    ...currentToolbarSettings,
    labelMode: labelModeInput.value,
  });
});

openSidebarBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "open-sidebar" });
  window.close();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[SELECTION_TOOLBAR_ENABLED_STORAGE_KEY]) {
    renderEnabledState(
      changes[SELECTION_TOOLBAR_ENABLED_STORAGE_KEY].newValue !== false
    );
  }

  if (changes[ACTION_SETTINGS_STORAGE_KEY]) {
    const actionSettings = normalizeActionSettings(
      changes[ACTION_SETTINGS_STORAGE_KEY].newValue
    );
    populateTranslateLanguageOptions(actionSettings.translate.targetLanguage);
  }

  if (changes[TOOLBAR_SETTINGS_STORAGE_KEY]) {
    currentToolbarSettings = normalizeToolbarSettings(
      changes[TOOLBAR_SETTINGS_STORAGE_KEY].newValue
    );
    renderToolbarActions();
  }

  if (changes[PLATFORM_STORAGE_KEY]) {
    const newId = changes[PLATFORM_STORAGE_KEY].newValue || DEFAULT_PLATFORM;
    platformSelectInput.value = newId;
    updateBrandTitle(newId);
  }
});

document.addEventListener("DOMContentLoaded", loadPopupSettings);
