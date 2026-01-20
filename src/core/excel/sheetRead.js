/**
 * @fileoverview Core logic for reading translation data from Excel worksheets.
 * Handles header validation, language mapping, and duplicate key detection.
 * @module core/excel/sheetRead
 */

import { validateLanguageCode } from '../../io/paths.js';
import { setNestedValue } from '../json/structure.js';
import { createReverseLanguageMap } from '../languages/mapping.js';

/**
 * Parses and validates the header row of a translation worksheet.
 * Maps display names to language codes and detects duplicate columns.
 *
 * @param {Array<string | null>} rawHeaders - Raw header values (starting from column 2).
 * @param {Object<string, string>} reverseLanguageMap - Reverse map (display name -> code).
 * @returns {string[]} Array of validated language codes.
 * @throws {Error} If any header is empty or duplicate language columns are found.
 * @private
 */
function parseHeaders(rawHeaders, reverseLanguageMap) {
  const languageNames = rawHeaders.map((h, idx) => {
    const v = h == null ? '' : String(h).trim();
    if (!v) {
      throw new Error(`Empty language header at column ${idx + 2}`);
    }
    return v;
  });

  const mappedCodes = languageNames.map(
    (name) => reverseLanguageMap[name] ?? name,
  );

  const seenCodes = new Map();
  for (const [i, code] of mappedCodes.entries()) {
    validateLanguageCode(code);
    if (seenCodes.has(code)) {
      const first = seenCodes.get(code);
      throw new Error(
        `Duplicate language columns for code "${code}" at columns ${first} and ${i + 2}`,
      );
    }
    seenCodes.set(code, i + 2);
  }

  return mappedCodes;
}

/**
 * Reads translation data from an Excel worksheet.
 *
 * Parses the header row for language codes, validates them, and extracts
 * translations for each language. Supports nested keys using dot notation
 * (e.g., 'app.title' becomes { app: { title: '...' } }).
 *
 * Expected worksheet format:
 * - Row 1: Headers with 'Key' in column 1, language codes/names in subsequent columns
 * - Row 2+: Translation data with key in column 1, values in language columns
 *
 * @param {Object} worksheet - ExcelJS Worksheet instance.
 * @param {Object<string, string>} [languageMap={}] - Map of language code to display name.
 *   Used to reverse-map display names in headers back to codes.
 * @returns {{languages: string[], translationsByLanguage: Object<string, Object>, duplicates: string[]}}
 *   - languages: Array of language codes found in headers
 *   - translationsByLanguage: Object with language codes as keys and nested translation objects as values
 *   - duplicates: Array of translation keys that appear more than once
 * @throws {Error} If headers are empty, invalid, or duplicate language columns exist.
 * @example
 * const { languages, translationsByLanguage, duplicates } = readTranslationsFromWorksheet(
 *   worksheet,
 *   { en: 'English', de: 'German' }
 * );
 */
export function readTranslationsFromWorksheet(worksheet, languageMap = {}) {
  const reverseLanguageMap = createReverseLanguageMap(languageMap);
  const headerRow = worksheet.getRow(1).values;
  const rawHeaders = headerRow.slice(2);

  const languages = parseHeaders(rawHeaders, reverseLanguageMap);

  const translationsByLanguage = Object.fromEntries(
    languages.map((l) => [l, {}]),
  );
  const seen = new Set();
  const duplicates = new Set();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const key = row.getCell(1).value;
    if (!key) return;
    const keyStr = String(key);
    if (seen.has(keyStr)) duplicates.add(keyStr);
    else seen.add(keyStr);

    for (const [index, lang] of languages.entries()) {
      const value = row.getCell(index + 2).value;
      if (value !== undefined && value !== null) {
        setNestedValue(translationsByLanguage[lang], keyStr.split('.'), value);
      }
    }
  });

  return {
    languages,
    translationsByLanguage,
    duplicates: [...duplicates],
  };
}
