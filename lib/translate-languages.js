(function (globalScope) {
  const TRANSLATE_LANGUAGES = Object.freeze([
    Object.freeze({ value: "Arabic", label: "العربية" }),
    Object.freeze({ value: "Bengali", label: "বাংলা" }),
    Object.freeze({ value: "Bulgarian", label: "Български" }),
    Object.freeze({ value: "Chinese (Simplified)", label: "简体中文" }),
    Object.freeze({ value: "Chinese (Traditional)", label: "繁體中文" }),
    Object.freeze({ value: "Croatian", label: "Hrvatski" }),
    Object.freeze({ value: "Czech", label: "Čeština" }),
    Object.freeze({ value: "Danish", label: "Dansk" }),
    Object.freeze({ value: "Dutch", label: "Nederlands" }),
    Object.freeze({ value: "English", label: "English" }),
    Object.freeze({ value: "Estonian", label: "Eesti" }),
    Object.freeze({ value: "Finnish", label: "Suomi" }),
    Object.freeze({ value: "French", label: "Français" }),
    Object.freeze({ value: "German", label: "Deutsch" }),
    Object.freeze({ value: "Greek", label: "Ελληνικά" }),
    Object.freeze({ value: "Hebrew", label: "עברית" }),
    Object.freeze({ value: "Hindi", label: "हिन्दी" }),
    Object.freeze({ value: "Hungarian", label: "Magyar" }),
    Object.freeze({ value: "Indonesian", label: "Bahasa Indonesia" }),
    Object.freeze({ value: "Italian", label: "Italiano" }),
    Object.freeze({ value: "Japanese", label: "日本語" }),
    Object.freeze({ value: "Korean", label: "한국어" }),
    Object.freeze({ value: "Latvian", label: "Latviešu" }),
    Object.freeze({ value: "Lithuanian", label: "Lietuvių" }),
    Object.freeze({ value: "Malay", label: "Bahasa Melayu" }),
    Object.freeze({ value: "Norwegian", label: "Norsk" }),
    Object.freeze({ value: "Persian", label: "فارسی" }),
    Object.freeze({ value: "Polish", label: "Polski" }),
    Object.freeze({ value: "Portuguese", label: "Português" }),
    Object.freeze({ value: "Romanian", label: "Română" }),
    Object.freeze({ value: "Russian", label: "Русский" }),
    Object.freeze({ value: "Serbian", label: "Српски" }),
    Object.freeze({ value: "Slovak", label: "Slovenčina" }),
    Object.freeze({ value: "Slovenian", label: "Slovenščina" }),
    Object.freeze({ value: "Spanish", label: "Español" }),
    Object.freeze({ value: "Swedish", label: "Svenska" }),
    Object.freeze({ value: "Tamil", label: "தமிழ்" }),
    Object.freeze({ value: "Thai", label: "ไทย" }),
    Object.freeze({ value: "Turkish", label: "Türkçe" }),
    Object.freeze({ value: "Ukrainian", label: "Українська" }),
    Object.freeze({ value: "Urdu", label: "اردو" }),
    Object.freeze({ value: "Vietnamese", label: "Tiếng Việt" }),
  ]);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { TRANSLATE_LANGUAGES };
  }

  if (globalScope) {
    globalScope.TRANSLATE_LANGUAGES = TRANSLATE_LANGUAGES;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
