/**
 * @fileoverview Application logic for AI-powered auto-translation of Excel workbooks.
 * Uses Gemini API to translate missing values from a source language to target languages.
 * @module app/translate
 */

import { GeminiProvider } from '../core/translator.js';
import { assertNonEmptyString } from '../core/validation.js';

/** @constant {number} Index of the header row in Excel worksheets */
const HEADER_ROW_INDEX = 1;

/**
 * Converts a value to a trimmed string, handling null/undefined.
 * @param {unknown} value - Value to convert.
 * @returns {string} Trimmed string or empty string.
 * @private
 */
const toTrimmedString = (value) =>
  value === undefined || value === null ? '' : String(value).trim();

/**
 * Collects header information from a worksheet.
 * @param {Object} worksheet - ExcelJS worksheet instance.
 * @returns {Array<{header: string, colNumber: number}>} Array of header objects.
 * @private
 */
const collectHeaders = (worksheet) => {
  const headerRow = worksheet.getRow(HEADER_ROW_INDEX);
  const headers = [];
  headerRow.eachCell((cell, colNumber) => {
    const header = toTrimmedString(cell.value);
    if (header) headers.push({ header, colNumber });
  });
  return headers;
};

/**
 * Case-insensitive exact header match.
 * @param {string} header - Header value to check.
 * @param {string} candidate - Candidate to match against.
 * @returns {boolean} True if headers match.
 * @private
 */
const matchHeader = (header, candidate) =>
  header.toLowerCase() === candidate.toLowerCase();

/**
 * Case-insensitive partial header match.
 * @param {string} header - Header value to check.
 * @param {string} candidate - Candidate to search for.
 * @returns {boolean} True if header contains candidate.
 * @private
 */
const containsHeader = (header, candidate) =>
  header.toLowerCase().includes(candidate.toLowerCase());

/**
 * Resolves a language code to a column number using various matching strategies.
 * @param {Array<{header: string, colNumber: number}>} headers - Header objects.
 * @param {string} langCode - Language code to find.
 * @param {Object<string, string>} [languageMap={}] - Language code to display name mapping.
 * @returns {number | undefined} Column number if found, undefined otherwise.
 * @private
 */
const resolveColumn = (headers, langCode, languageMap = {}) => {
  const mappedName = languageMap[langCode];
  const direct = headers.find(({ header }) => matchHeader(header, langCode));
  if (direct) return direct.colNumber;

  if (mappedName) {
    const mapped = headers.find(({ header }) =>
      matchHeader(header, mappedName),
    );
    if (mapped) return mapped.colNumber;
  }

  const fuzzy = headers.find(({ header }) => containsHeader(header, langCode));
  if (fuzzy) return fuzzy.colNumber;

  if (mappedName) {
    const fuzzyMapped = headers.find(({ header }) =>
      containsHeader(header, mappedName),
    );
    if (fuzzyMapped) return fuzzyMapped.colNumber;
  }
};

/**
 * Finds target columns (all language columns except key and source).
 * @param {Array<{header: string, colNumber: number}>} headers - Header objects.
 * @param {number} sourceColNumber - Source language column number.
 * @returns {Array<{header: string, colNumber: number}>} Target column objects.
 * @private
 */
const findTargetColumns = (headers, sourceColNumber) =>
  headers.filter(
    ({ colNumber }) => colNumber !== 1 && colNumber !== sourceColNumber,
  );

/**
 * Collects rows with missing translations for a target column.
 * @param {Object} worksheet - ExcelJS worksheet instance.
 * @param {number} sourceCol - Source language column number.
 * @param {number} targetCol - Target language column number.
 * @returns {Array<{rowNumber: number, sourceText: string}>} Rows needing translation.
 * @private
 */
const collectMissingForTarget = (worksheet, sourceCol, targetCol) => {
  const missing = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === HEADER_ROW_INDEX) return;
    const sourceCell = row.getCell(sourceCol);
    const targetCell = row.getCell(targetCol);
    const sourceText = toTrimmedString(sourceCell?.value);
    const targetText = toTrimmedString(targetCell?.value);
    if (sourceText && !targetText) {
      missing.push({ rowNumber, sourceText });
    }
  });
  return missing;
};

/**
 * Applies translated values to worksheet cells.
 * @param {Object} worksheet - ExcelJS worksheet instance.
 * @param {number} targetCol - Target column number.
 * @param {Array<{rowNumber: number, sourceText: string}>} rows - Row metadata.
 * @param {string[]} translated - Translated strings.
 * @returns {number} Number of cells updated.
 * @private
 */
const applyTranslations = (worksheet, targetCol, rows, translated) => {
  let changes = 0;
  for (const [index, rowMeta] of rows.entries()) {
    const text = translated[index];
    if (text === undefined || text === null) continue;
    const row = worksheet.getRow(rowMeta.rowNumber);
    row.getCell(targetCol).value = text;
    changes += 1;
  }
  return changes;
};

/**
 * Derives target language code from header name using language map.
 * @param {string} headerName - Column header name.
 * @param {Object<string, string>} [languageMap={}] - Language code to display name mapping.
 * @returns {string} Language code if found, otherwise the original header name.
 * @private
 */
const deriveTargetLang = (headerName, languageMap = {}) => {
  const match = Object.entries(languageMap).find(([, display]) =>
    matchHeader(display, headerName),
  );
  return match ? match[0] : headerName;
};

/**
 * Validates worksheet headers and resolves source/target columns.
 * @param {Object} worksheet - ExcelJS worksheet.
 * @param {string} sourceLang - Source language code.
 * @param {Object<string, string>} languageMap - Language code to display name map.
 * @returns {{sourceCol: number, targets: Array<{header:string,colNumber:number}>}}
 * @throws {Error} If headers are missing or source column cannot be found.
 * @private
 */
const prepareTargets = (worksheet, sourceLang, languageMap) => {
  const headers = collectHeaders(worksheet);
  if (headers.length === 0) {
    throw new Error('Worksheet header row is empty or missing.');
  }

  const availableHeaders = headers.map((h) => h.header).join(', ');
  const sourceCol = resolveColumn(headers, sourceLang, languageMap);

  if (!sourceCol) {
    throw new Error(
      `Source header for "${sourceLang}" not found. Available headers: ${availableHeaders}`,
    );
  }

  const targets = findTargetColumns(headers, sourceCol);
  return { sourceCol, targets };
};

/**
 * Translates missing values for a single target language column.
 * @param {Object} worksheet - ExcelJS worksheet.
 * @param {number} sourceCol - Source column number.
 * @param {{header:string,colNumber:number}} target - Target column metadata.
 * @param {Object<string,string>} languageMap - Language code to display name map.
 * @param {import('../core/translator.js').TranslationProvider} provider - Translation provider instance.
 * @param {string} sourceLang - Source language code.
 * @returns {Promise<number>} Number of cells updated.
 * @private
 */
const translateTarget = async (
  worksheet,
  sourceCol,
  target,
  { languageMap, provider, sourceLang },
) => {
  const targetLang = deriveTargetLang(target.header, languageMap);
  const missing = collectMissingForTarget(
    worksheet,
    sourceCol,
    target.colNumber,
  );

  if (missing.length === 0) return 0;

  const textsToTranslate = missing.map((row) => row.sourceText);
  const translated = await provider.translateBatch(
    textsToTranslate,
    sourceLang,
    targetLang,
  );

  return applyTranslations(worksheet, target.colNumber, missing, translated);
};

/**
 * Orchestrates the AI auto-translation process for an Excel workbook.
 *
 * Reads an Excel file, identifies missing translations, uses Gemini API
 * to translate missing values, and writes the updated workbook.
 *
 * @param {import('../types.js').IoAdapter} io - IO adapter with Excel read/write support.
 * @param {Object} options - Translation options.
 * @param {string} options.input - Path to Excel file.
 * @param {string} [options.sourceLang='en'] - Source language code.
 * @param {string} options.apiKey - Gemini API key.
 * @param {string} [options.model='gemini-2.5-flash'] - Gemini model to use.
 * @param {Object<string, string>} [options.languageMap={}] - Language code to display name mapping.
 * @param {Object} [deps={}] - Dependencies for testing (e.g., mock provider).
 * @param {Object} [deps.provider] - Translation provider instance (for testing).
 * @returns {Promise<void>} Resolves when translation is complete.
 * @throws {Error} If API key is missing or worksheet is empty.
 * @example
 * await translateApp(io, {
 *   input: './translations.xlsx',
 *   sourceLang: 'en',
 *   apiKey: 'sk-...',
 *   languageMap: { en: 'English', de: 'German' }
 * });
 */
export async function translateApp(io, options, deps = {}) {
  const { input, sourceLang = 'en', apiKey, model, languageMap = {} } = options;

  if (!apiKey) {
    throw new Error(
      'API Key is required for translation. Use --api-key or env var.',
    );
  }

  assertNonEmptyString(input, 'input');
  assertNonEmptyString(sourceLang, 'sourceLang');

  const provider = deps.provider ?? new GeminiProvider(apiKey, model);

  const workbook = new io.Excel.Workbook();
  await io.readWorkbook(input, workbook);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Workbook does not contain a worksheet to translate.');
  }

  const { sourceCol, targets } = prepareTargets(
    worksheet,
    sourceLang,
    languageMap,
  );

  if (targets.length === 0) {
    console.log('No target language columns detected.');
    return;
  }

  let changesCount = 0;

  for (const target of targets) {
    changesCount += await translateTarget(worksheet, sourceCol, target, {
      languageMap,
      provider,
      sourceLang,
    });
  }

  if (changesCount > 0) {
    await io.writeWorkbook(input, workbook);
    console.log(`Updated ${changesCount} cells in ${input}`);
  } else {
    console.log('No missing translations found.');
  }
}
