/**
 * Core logic for generating translation reports.
 * Analyzes translations for missing values, duplicates, and placeholder inconsistencies.
 * @module core/report/translationReport
 * Translation report generation utilities.
 * @typedef {import('../../types.js').TranslationReport} TranslationReport
 */

import { extractPlaceholders } from '../json/placeholders.js';

/**
 * Computes languages that are missing translations for a given key.
 * Compute languages missing a translation value (empty string counts as missing).
 * @param {string[]} languages - Known language codes.
 * @param {Object<string,string>} langValues - Map of language->value for a key.
 * @returns {string[]} Language codes missing values.
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
 * Build a map of placeholders per language for a given key.
 * @param {string[]} languages - Language codes.
 * @param {Object<string,string>} langValues - Map of language->string value.
 * @returns {Object<string,Set<string>>} Placeholder sets per language.
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
 * Aggregate all unique placeholders across languages.
 * @param {Object<string,Set<string>>} placeholderMap - Map of language->Set.
 * @returns {Set<string>} Unified placeholder set.
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
 * Detect any placeholder inconsistencies: missing placeholder in any language.
 * @param {Object<string,Set<string>>} placeholderMap - Map of language->Set.
 * @param {Set<string>} allPlaceholders - Unified placeholder set.
 * @param {string[]} languages - Language codes.
 * @returns {boolean} True if any language omits a placeholder.
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
 * Generate a translation report from aggregated translations.
 * @param {Map<string,Object<string,string>>} translations - Map of key->language values.
 * @param {string[]} languages - Language codes.
 * @returns {TranslationReport} Report data object.
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
