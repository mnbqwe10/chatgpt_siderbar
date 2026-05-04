const promptsList = document.getElementById("prompts-list");
const addPromptForm = document.getElementById("add-prompt-form");
const promptNameInput = document.getElementById("prompt-name");
const promptTemplateInput = document.getElementById("prompt-template");
const builtInActionsForm = document.getElementById("built-in-actions-form");
const explainTemplateInput = document.getElementById("explain-template");
const translateLanguageInput = document.getElementById("translate-language");
const translateTemplateInput = document.getElementById("translate-template");
const summarizeTemplateInput = document.getElementById("summarize-template");
const resetBuiltInsBtn = document.getElementById("reset-built-ins-btn");
const blockedSitesList = document.getElementById("blocked-sites-list");
const addSiteForm = document.getElementById("add-site-form");
const siteInput = document.getElementById("site-input");
const TRANSLATE_LANGUAGES = [
  "Arabic",
  "Bengali",
  "Bulgarian",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Latvian",
  "Lithuanian",
  "Malay",
  "Norwegian",
  "Persian",
  "Polish",
  "Portuguese",
  "Romanian",
  "Russian",
  "Serbian",
  "Slovak",
  "Slovenian",
  "Spanish",
  "Swedish",
  "Tamil",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createActionButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function renderPrompts(prompts) {
  promptsList.innerHTML = "";
  if (prompts.length === 0) {
    promptsList.innerHTML = "<p class='hint'>No custom prompts yet.</p>";
    return;
  }

  const ul = document.createElement("ul");
  prompts.forEach((p) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = p.name;
    label.appendChild(name);
    label.appendChild(document.createTextNode(`: ${p.template}`));
    li.appendChild(label);
    li.appendChild(
      createActionButton("Delete", "delete-btn", () => deletePrompt(p.id))
    );
    ul.appendChild(li);
  });
  promptsList.appendChild(ul);
}

function populateTranslateLanguageOptions(selectedLanguage) {
  const languages = [...TRANSLATE_LANGUAGES];
  if (selectedLanguage && !languages.includes(selectedLanguage)) {
    languages.push(selectedLanguage);
  }

  languages.sort((a, b) => a.localeCompare(b));
  translateLanguageInput.innerHTML = "";

  languages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language;
    translateLanguageInput.appendChild(option);
  });

  translateLanguageInput.value = selectedLanguage || "English";
}

function renderBuiltInActions(actionSettings) {
  explainTemplateInput.value = actionSettings.explain.template;
  populateTranslateLanguageOptions(actionSettings.translate.targetLanguage);
  translateTemplateInput.value = actionSettings.translate.template;
  summarizeTemplateInput.value = actionSettings.summarize.template;
}

function renderBlockedSites(sites) {
  blockedSitesList.innerHTML = "";
  if (sites.length === 0) {
    blockedSitesList.innerHTML = "<p class='hint'>No blocked sites.</p>";
    return;
  }

  const ul = document.createElement("ul");
  sites.forEach((site) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = site;
    li.appendChild(label);
    li.appendChild(
      createActionButton("Unblock", "delete-btn", () => unblockSite(site))
    );
    ul.appendChild(li);
  });
  blockedSitesList.appendChild(ul);
}

function loadSettings() {
  chrome.storage.local.get(
    ["customPrompts", "blockedSites", ACTION_SETTINGS_STORAGE_KEY],
    (data) => {
      renderBuiltInActions(
        normalizeActionSettings(data[ACTION_SETTINGS_STORAGE_KEY])
      );
      renderPrompts(data.customPrompts || []);
      renderBlockedSites(data.blockedSites || []);
    }
  );
}

function saveBuiltInActions(actionSettings) {
  chrome.storage.local.set(
    { [ACTION_SETTINGS_STORAGE_KEY]: actionSettings },
    () => {
      renderBuiltInActions(actionSettings);
    }
  );
}

builtInActionsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const actionSettings = normalizeActionSettings({
    explain: {
      template: explainTemplateInput.value,
    },
    translate: {
      targetLanguage: translateLanguageInput.value,
      template: translateTemplateInput.value,
    },
    summarize: {
      template: summarizeTemplateInput.value,
    },
  });
  saveBuiltInActions(actionSettings);
});

resetBuiltInsBtn.addEventListener("click", () => {
  const defaults = getDefaultActionSettings();
  saveBuiltInActions(defaults);
});

addPromptForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = promptNameInput.value.trim();
  const template = promptTemplateInput.value.trim();
  if (!name || !template) return;
  chrome.storage.local.get("customPrompts", (data) => {
    const prompts = data.customPrompts || [];
    prompts.push({ id: generateId(), name, template, enabled: true });
    chrome.storage.local.set({ customPrompts: prompts }, () => {
      promptNameInput.value = "";
      promptTemplateInput.value = "";
      renderPrompts(prompts);
    });
  });
});

function deletePrompt(id) {
  chrome.storage.local.get("customPrompts", (data) => {
    const prompts = (data.customPrompts || []).filter((p) => p.id !== id);
    chrome.storage.local.set({ customPrompts: prompts }, () => renderPrompts(prompts));
  });
}

addSiteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const site = siteInput.value.trim();
  if (!site) return;
  chrome.storage.local.get("blockedSites", (data) => {
    const sites = data.blockedSites || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.local.set({ blockedSites: sites }, () => {
        siteInput.value = "";
        renderBlockedSites(sites);
      });
    }
  });
});

function unblockSite(site) {
  chrome.storage.local.get("blockedSites", (data) => {
    const sites = (data.blockedSites || []).filter((s) => s !== site);
    chrome.storage.local.set({ blockedSites: sites }, () => renderBlockedSites(sites));
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);
