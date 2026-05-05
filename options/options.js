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
  { value: "Arabic", label: "العربية" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Bulgarian", label: "Български" },
  { value: "Chinese (Simplified)", label: "简体中文" },
  { value: "Chinese (Traditional)", label: "繁體中文" },
  { value: "Croatian", label: "Hrvatski" },
  { value: "Czech", label: "Čeština" },
  { value: "Danish", label: "Dansk" },
  { value: "Dutch", label: "Nederlands" },
  { value: "English", label: "English" },
  { value: "Estonian", label: "Eesti" },
  { value: "Finnish", label: "Suomi" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Greek", label: "Ελληνικά" },
  { value: "Hebrew", label: "עברית" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Hungarian", label: "Magyar" },
  { value: "Indonesian", label: "Bahasa Indonesia" },
  { value: "Italian", label: "Italiano" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Latvian", label: "Latviešu" },
  { value: "Lithuanian", label: "Lietuvių" },
  { value: "Malay", label: "Bahasa Melayu" },
  { value: "Norwegian", label: "Norsk" },
  { value: "Persian", label: "فارسی" },
  { value: "Polish", label: "Polski" },
  { value: "Portuguese", label: "Português" },
  { value: "Romanian", label: "Română" },
  { value: "Russian", label: "Русский" },
  { value: "Serbian", label: "Српски" },
  { value: "Slovak", label: "Slovenčina" },
  { value: "Slovenian", label: "Slovenščina" },
  { value: "Spanish", label: "Español" },
  { value: "Swedish", label: "Svenska" },
  { value: "Tamil", label: "தமிழ்" },
  { value: "Thai", label: "ไทย" },
  { value: "Turkish", label: "Türkçe" },
  { value: "Ukrainian", label: "Українська" },
  { value: "Urdu", label: "اردو" },
  { value: "Vietnamese", label: "Tiếng Việt" },
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
  if (
    selectedLanguage &&
    !languages.some((language) => language.value === selectedLanguage)
  ) {
    languages.push({ value: selectedLanguage, label: selectedLanguage });
  }

  translateLanguageInput.innerHTML = "";

  languages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.value;
    option.textContent = language.label;
    option.title = language.value;
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
