/**
 * @fileoverview Core logic for writing translation data to Excel worksheets.
 * Creates formatted worksheets with headers, styling, and translation data.
 * @module core/excel/sheetWrite
 */

/** @constant {number} Default column width for translation columns */
const DEFAULT_COLUMN_WIDTH = 40;

/** @constant {string} Header row fill color (light gray) */
const HEADER_FILL_COLOR = 'FFD3D3D3';

/**
 * Applies styling to the worksheet header row.
 * Sets column widths and applies bold font with gray background.
 *
 * @param {Object} worksheet - ExcelJS worksheet instance.
 * @private
 */
const applyHeaderStyles = (worksheet) => {
  for (const column of worksheet.columns) {
    column.width = DEFAULT_COLUMN_WIDTH;
  }
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: HEADER_FILL_COLOR },
  };
};

/**
 * Creates a translation worksheet in the given workbook.
 *
 * Creates a new worksheet with a header row containing language column names,
 * followed by rows for each translation key with values in each language column.
 * Keys are sorted alphabetically for deterministic output.
 *
 * **Important**: Language headers should always be display names (e.g., 'German', 'English'),
 * not language codes (e.g., 'de', 'en'). If languageMap is not provided, this function
 * will still work but will use codes as headers. For consistency, always pass a languageMap.
 *
 * @param {Object} workbook - ExcelJS Workbook instance.
 * @param {string} sheetName - Name for the new worksheet.
 * @param {Map<string, Object<string, string>>} translations - Map of translation keys to language value objects.
 * @param {string[]} languageCodes - Array of language codes to include as columns.
 * @param {Object<string, string>} [languageMap] - Map of language codes to display names for headers.
 * @returns {Object} The created ExcelJS Worksheet instance.
 * @example
 * const translations = new Map([
 *   ['app.title', { en: 'My App', de: 'Meine App' }]
 * ]);
 * createTranslationWorksheet(workbook, 'Translations', translations, ['en', 'de'], { en: 'English', de: 'German' });
 */
export function createTranslationWorksheet(
  workbook,
  sheetName,
  translations,
  languageCodes,
  languageMap,
) {
  const worksheet = workbook.addWorksheet(sheetName);
  const sortedLangs = [...languageCodes];
  const languageNames = sortedLangs.map((code) => languageMap?.[code] ?? code);

  worksheet.addRow(['Key', ...languageNames]);

  for (const key of [...translations.keys()].toSorted()) {
    const langValues = translations.get(key) ?? {};
    const row = [key, ...sortedLangs.map((lang) => langValues[lang] ?? '')];
    worksheet.addRow(row);
  }

  applyHeaderStyles(worksheet);

  return worksheet;
}
