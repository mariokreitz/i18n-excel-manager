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
 * Empty string values are treated as missing.
 * @param {string[]} languages - Known language codes.
 * @param {Object<string,string>} langValues - Map of language->value for a key.
 * @returns {string[]} Language codes missing values.
 */
const computeMissingLangs = (languages, langValues) =>
  languages.filter(
    (lang) =>
      !Object.prototype.hasOwnProperty.call(langValues, lang) ||
      langValues[lang] === '',
  );

/**
 * Builds a map of placeholders for each language's translation value.
 * @param {string[]} languages - Language codes.
 * @param {Object<string,string>} langValues - Map of language->string value.
 * @returns {Object<string,Set<string>>} Placeholder sets per language.
 */
const buildPlaceholderMap = (languages, langValues) =>
  Object.fromEntries(
    languages.map((lang) => [
      lang,
      extractPlaceholders(langValues[lang] || ''),
    ]),
  );

/**
 * Collects all unique placeholders across all languages.
 * @param {Object<string,Set<string>>} placeholderMap - Map of language->Set.
 * @returns {Set<string>} Unified placeholder set.
 */
const collectAllPlaceholders = (placeholderMap) => {
  const all = new Set();
  for (const set of Object.values(placeholderMap)) {
    for (const ph of set) all.add(ph);
  }
  return all;
};

/**
 * Checks if there are placeholder inconsistencies across languages.
 * Returns true when any language is missing at least one placeholder present in others.
 * @param {Object<string,Set<string>>} placeholderMap - Map of language->Set.
 * @param {Set<string>} allPlaceholders - Unified placeholder set.
 * @param {string[]} languages - Language codes.
 * @returns {boolean} True if any language omits a placeholder.
 */
const hasPlaceholderInconsistency = (
  placeholderMap,
  allPlaceholders,
  languages,
) =>
  languages.some((lang) =>
    [...allPlaceholders].some((ph) => !placeholderMap[lang].has(ph)),
  );

/**
 * Generates a comprehensive report on translation data, covering
 * missing values, duplicate keys, and placeholder inconsistencies.
 * @param {Map<string,Object<string,string>>} translations - Map of key->language values.
 * @param {string[]} languages - Language codes.
 * @returns {TranslationReport} Report data object.
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
