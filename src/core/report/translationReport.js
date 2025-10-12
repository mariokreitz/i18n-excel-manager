/**
 * Core logic for generating translation reports.
 * Analyzes translations for missing values, duplicates, and placeholder inconsistencies.
 */

import { extractPlaceholders } from '../json/placeholders.js';

/**
 * Computes languages that are missing translations for a given key.
 * @param {string[]} languages - Array of language codes.
 * @param {Object} langValues - Object mapping languages to translation values.
 * @returns {string[]} Array of language codes with missing or empty translations.
 */
function computeMissingLangs(languages, langValues) {
  const res = [];
  for (const lang of languages) {
    if (
      !Object.prototype.hasOwnProperty.call(langValues, lang) ||
      langValues[lang] === ''
    ) {
      res.push(lang);
    }
  }
  return res;
}

/**
 * Builds a map of placeholders for each language's translation value.
 * @param {string[]} languages - Array of language codes.
 * @param {Object} langValues - Object mapping languages to translation values.
 * @returns {Object.<string, Set<string>>} Map of language to set of placeholders.
 */
function buildPlaceholderMap(languages, langValues) {
  const map = {};
  for (const lang of languages) {
    const val = langValues[lang] || '';
    map[lang] = extractPlaceholders(val);
  }
  return map;
}

/**
 * Collects all unique placeholders across all languages.
 * @param {Object.<string, Set<string>>} placeholderMap - Map of language to placeholders.
 * @returns {Set<string>} Set of all unique placeholders.
 */
function collectAllPlaceholders(placeholderMap) {
  const all = new Set();
  for (const s of Object.values(placeholderMap)) {
    s.forEach((ph) => all.add(ph));
  }
  return all;
}

/**
 * Checks if there are placeholder inconsistencies across languages.
 * @param {Object.<string, Set<string>>} placeholderMap - Map of language to placeholders.
 * @param {Set<string>} allPlaceholders - Set of all placeholders found.
 * @param {string[]} languages - Array of language codes.
 * @returns {boolean} True if any language is missing a placeholder.
 */
function hasPlaceholderInconsistency(
  placeholderMap,
  allPlaceholders,
  languages,
) {
  for (const lang of languages) {
    const placeholders = placeholderMap[lang];
    for (const ph of allPlaceholders) {
      if (!placeholders.has(ph)) return true;
    }
  }
  return false;
}

/**
 * Generates a comprehensive report on translation data.
 * Identifies missing translations, duplicate keys, and placeholder inconsistencies.
 * @param {Map<string, Object>} translations - Map of translation keys to language value objects.
 * @param {string[]} languages - Array of language codes.
 * @returns {Object} Report object with missing, duplicates, and placeholderInconsistencies.
 * @returns {Array<{key: string, lang: string}>} result.missing - Array of missing translation entries.
 * @returns {string[]} result.duplicates - Array of duplicate key strings.
 * @returns {Array<{key: string, placeholders: Object.<string, Set<string>>}>} result.placeholderInconsistencies - Array of keys with inconsistent placeholders.
 */
export function generateTranslationReport(translations, languages) {
  const missing = [];
  const duplicates = [];
  const placeholderInconsistencies = [];
  const seen = new Set();

  for (const [key, langValues] of translations.entries()) {
    // Missing
    const missingLangs = computeMissingLangs(languages, langValues);
    for (const lang of missingLangs) missing.push({ key, lang });

    // Duplicates
    if (seen.has(key)) duplicates.push(key);
    else seen.add(key);

    // Placeholder consistency
    const placeholderMap = buildPlaceholderMap(languages, langValues);
    const allPlaceholders = collectAllPlaceholders(placeholderMap);
    if (
      hasPlaceholderInconsistency(placeholderMap, allPlaceholders, languages)
    ) {
      placeholderInconsistencies.push({ key, placeholders: placeholderMap });
    }
  }

  return { missing, duplicates, placeholderInconsistencies };
}
