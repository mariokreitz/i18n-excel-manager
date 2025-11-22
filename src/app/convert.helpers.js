/**
 * @module app/convert.helpers
 * Internal helper utilities supporting conversion orchestration.
 * @internal
 * @typedef {import('../types.js').Reporter} Reporter
 */

import ExcelJS from 'exceljs';

import { createTranslationWorksheet } from '../core/excel/sheetWrite.js';
import {
  flattenTranslations,
  validateJsonStructure,
} from '../core/json/structure.js';
import { generateTranslationReport } from '../core/report/translationReport.js';
import { safeJoinWithin, validateLanguageCode } from '../io/paths.js';

/**
 * Build aggregate translation map and language list from file inputs.
 * @param {Array<{name:string,data:Object}>} files Parsed JSON file entries.
 * @returns {{translations: Map<string, Object<string,string>>, languages: string[]}} Key-to-language map and sorted language codes.
 */
export function collectTranslations(files) {
  const translations = new Map();
  const langSet = new Set();
  for (const { name, data } of files) {
    const lang = name.replace(/\.json$/, '');
    langSet.add(lang);
    validateJsonStructure(data);
    flattenTranslations(data, '', (k, v) => {
      if (!translations.has(k)) translations.set(k, {});
      translations.get(k)[lang] = v;
    });
  }
  return { translations, languages: Array.from(langSet).toSorted() };
}

/**
 * Optionally generate and output a translation report (dry-run scenario mostly).
 * @param {Map<string,Object<string,string>>} translations Aggregated translations map.
 * @param {string[]} languages Language codes encountered.
 * @param {Reporter} reporter Reporter instance.
 * @param {boolean} shouldReport Flag controlling report emission.
 * @returns {void}
 */
export function maybeReport(translations, languages, reporter, shouldReport) {
  if (!shouldReport) return;
  const r = generateTranslationReport(translations, languages);
  reporter.print(r);
}

/**
 * Write an Excel workbook to disk using the provided IO adapter.
 * @param {IoAdapter} io IO abstraction.
 * @param {string} targetFile Destination file path.
 * @param {{sheetName:string,translations:Map<string,Object<string,string>>,languages:string[],languageMap:Object<string,string>}} params Composite parameters object.
 * @returns {Promise<void>} Resolves after write succeeds.
 */
export async function writeExcel(
  io,
  targetFile,
  { sheetName, translations, languages, languageMap },
) {
  const workbook = new ExcelJS.Workbook();
  createTranslationWorksheet(
    workbook,
    sheetName,
    translations,
    languages,
    languageMap,
  );
  await io.ensureDirectoryExists(io.dirname(targetFile));
  await io.writeWorkbook(targetFile, workbook);
}

/**
 * Read a worksheet from an Excel file, throwing if missing.
 * @param {IoAdapter} io IO abstraction.
 * @param {string} sourceFile Excel source path.
 * @param {string} sheetName Worksheet name to retrieve.
 * @returns {Promise<Object>} ExcelJS Worksheet.
 * @throws {Error} If worksheet is not found.
 */
export async function readWorksheet(io, sourceFile, sheetName) {
  const workbook = new ExcelJS.Workbook();
  await io.readWorkbook(sourceFile, workbook);
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`Worksheet "${sheetName}" not found`);
  return ws;
}

/**
 * Handle duplicate keys discovered during Excel -> JSON conversion flow.
 * @param {string[]} duplicates Duplicate key names.
 * @param {boolean} failOnDuplicates Whether to throw instead of warn.
 * @param {Reporter} reporter Reporter for warning output.
 * @returns {void}
 */
export function handleDuplicates(duplicates, failOnDuplicates, reporter) {
  if (duplicates.length === 0) return;
  const msg = `Duplicate keys detected in Excel: ${duplicates.join(', ')}`;
  if (failOnDuplicates) throw new Error(msg);
  reporter.warn(msg);
}

/**
 * Write per-language JSON files to target path.
 * @param {IoAdapter} io IO abstraction.
 * @param {string} targetPath Target directory.
 * @param {string[]} languages Language codes.
 * @param {Object<string,Object>} translationsByLanguage Nested translations keyed by language.
 * @returns {Promise<void>} Resolves after all files written.
 */
export async function writeLanguages(
  io,
  targetPath,
  languages,
  translationsByLanguage,
) {
  for (const lang of languages) {
    validateLanguageCode(lang);
    const filePath = safeJoinWithin(targetPath, `${lang}.json`);
    await io.writeJsonFile(filePath, translationsByLanguage[lang]);
  }
}
