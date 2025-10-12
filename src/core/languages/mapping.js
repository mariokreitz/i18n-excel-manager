/**
 * Utilities for language code mapping and validation.
 * Handles bidirectional mapping between language codes and display names.
 */

/**
 * Creates a reverse mapping from display names to language codes.
 * Given a map of code -> name, returns name -> code.
 * @param {Object} languageMap - Object mapping language codes to display names.
 * @returns {Object} Reverse mapping from display names to codes.
 */
export function createReverseLanguageMap(languageMap) {
  const reverseMap = {};
  for (const [code, name] of Object.entries(languageMap || {})) {
    reverseMap[name] = code;
  }
  return reverseMap;
}
