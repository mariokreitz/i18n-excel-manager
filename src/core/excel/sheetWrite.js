/**
 * Core logic for writing translation data to Excel worksheets.
 * Creates worksheets with proper headers, styling, and translation rows.
 */

/**
 * Creates a translation worksheet in the given workbook.
 * Adds a header row with language names, then rows for each translation key with values per language.
 * Applies basic styling like column widths and header formatting.
 * @param {Object} workbook - ExcelJS workbook object to add the worksheet to.
 * @param {string} sheetName - Name of the worksheet to create.
 * @param {Map<string, Object>} translations - Map of translation keys to objects with language values.
 * @param {string[]} languageCodes - Array of language codes to include as columns.
 * @param {Object} languageMap - Mapping from language codes to display names for headers.
 * @returns {Object} The created ExcelJS worksheet object.
 */
export function createTranslationWorksheet(
  workbook,
  sheetName,
  translations,
  languageCodes,
  languageMap,
) {
  const worksheet = workbook.addWorksheet(sheetName);
  const sortedLangs = Array.from(languageCodes);
  // languageCodes assumed sorted by caller; keep as-is but ensure stable copy
  const languageNames = sortedLangs.map((code) =>
    languageMap && languageMap[code] ? languageMap[code] : code,
  );
  const headerRow = ['Key', ...languageNames];
  worksheet.addRow(headerRow);

  const keys = Array.from(translations.keys()).sort();
  for (const key of keys) {
    const langValues = translations.get(key) || {};
    const row = [key];
    for (const lang of sortedLangs) {
      row.push(langValues[lang] || '');
    }
    worksheet.addRow(row);
  }

  worksheet.columns.forEach((column) => {
    column.width = 40;
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  return worksheet;
}
