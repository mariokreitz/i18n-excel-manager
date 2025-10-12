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
