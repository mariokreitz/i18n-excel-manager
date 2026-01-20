/**
 * @module core/languages/mapping
 * Language mapping utilities (code <-> display name).
 */

/**
 * Utilities for language code mapping and validation.
 * Handles bidirectional mapping between language codes and display names.
 */

/**
 * Create reverse displayName->code map from code->name input.
 * @param {Object<string,string>} languageMap Code->display name mapping.
 * @returns {Object<string,string>} Reverse mapping.
 */
export function createReverseLanguageMap(languageMap) {
  const reverseMap = {};
  for (const [code, name] of Object.entries(languageMap || {})) {
    reverseMap[name] = code;
  }
  return reverseMap;
}

/**
 * Generate a default language map from language codes.
 * Creates a mapping where each code maps to a capitalized display name.
 * Used when no explicit languageMap is provided to ensure consistent headers.
 *
 * @param {string[]} languageCodes Array of language codes.
 * @returns {Object<string,string>} Map of code -> capitalized name.
 * @example
 * generateDefaultLanguageMap(['en', 'de', 'fr'])
 * // Returns: { en: 'English', de: 'Deutsch', fr: 'Français' }
 * // Note: This is a best-effort capitalization; a real mapping is recommended.
 */
export function generateDefaultLanguageMap(languageCodes) {
  const map = {};
  const languageNames = {
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ar: 'Arabic',
    he: 'Hebrew',
    hi: 'Hindi',
    tr: 'Turkish',
    pl: 'Polish',
    nl: 'Dutch',
    sv: 'Swedish',
    da: 'Danish',
    fi: 'Finnish',
    no: 'Norwegian',
    cs: 'Czech',
    ro: 'Romanian',
    hu: 'Hungarian',
    el: 'Greek',
    uk: 'Ukrainian',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
    fa: 'Persian',
    am: 'Amharic',
    kk: 'Kazakh',
    ks: 'Kashmiri',
    ps: 'Pashto',
    ur: 'Urdu',
    ta: 'Tamil',
    uz: 'Uzbek',
    md: 'Mandarin',
    sw: 'Swahili',
    ti: 'Tigrinya',
    pa: 'Punjabi',
    hy: 'Armenian',
    az: 'Azerbaijani',
    si: 'Sinhala',
    sq: 'Albanian',
    bs: 'Bosnian',
    hr: 'Croatian',
    mk: 'Macedonian',
    sr: 'Serbian',
    ka: 'Georgian',
    so: 'Somali',
  };

  for (const code of languageCodes || []) {
    map[code] =
      languageNames[code] || code.charAt(0).toUpperCase() + code.slice(1);
  }
  return map;
}
