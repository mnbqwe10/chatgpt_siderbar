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

function createActionButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
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
    ["blockedSites", ACTION_SETTINGS_STORAGE_KEY],
    (data) => {
      renderBuiltInActions(
        normalizeActionSettings(data[ACTION_SETTINGS_STORAGE_KEY])
      );
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
