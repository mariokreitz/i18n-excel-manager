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
