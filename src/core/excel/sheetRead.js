import { validateLanguageCode } from '../../io/paths.js';
import { setNestedValue } from '../json/structure.js';
import { createReverseLanguageMap } from '../languages/mapping.js';

export function readTranslationsFromWorksheet(worksheet, languageMap = {}) {
  const reverseLanguageMap = createReverseLanguageMap(languageMap);
  const headerRow = worksheet.getRow(1).values;
  const rawHeaders = headerRow.slice(2);

  // Validate headers
  const languageNames = rawHeaders.map((h, idx) => {
    const v = h == null ? '' : String(h).trim();
    if (!v) {
      const col = idx + 2;
      throw new Error(`Empty language header at column ${col}`);
    }
    return v;
  });

  // Map display names to codes where applicable
  const mappedCodes = languageNames.map(
    (name) => reverseLanguageMap[name] || name,
  );

  // Validate codes format and detect duplicates
  const seenCodes = new Map(); // code -> firstColumnIndex
  for (const [i, code] of mappedCodes.entries()) {
    // Validate language code to prevent path traversal later
    validateLanguageCode(code);
    if (seenCodes.has(code)) {
      const first = seenCodes.get(code);
      const dupCol = i + 2;
      throw new Error(
        `Duplicate language columns for code "${code}" at columns ${first} and ${dupCol}`,
      );
    }
    seenCodes.set(code, i + 2);
  }

  const languages = mappedCodes;

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

    languages.forEach((lang, index) => {
      const value = row.getCell(index + 2).value;
      if (value !== undefined && value !== null) {
        setNestedValue(translationsByLanguage[lang], keyStr.split('.'), value);
      }
    });
  });

  return {
    languages,
    translationsByLanguage,
    duplicates: Array.from(duplicates),
  };
}
