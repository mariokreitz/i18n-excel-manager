/**
 * Application logic for converting between JSON and Excel formats for internationalization.
 * Provides functions to convert JSON files to Excel workbooks and vice versa.
 * @module app/convert
 * Core application-level conversion orchestrators.
 * @typedef {import('../types.js').IoAdapter} IoAdapter
 * @typedef {import('../types.js').Reporter} Reporter
 * @typedef {import('../types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('../types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

import { readTranslationsFromWorksheet } from '../core/excel/sheetRead.js';
import { consoleReporter as defaultConsoleReporter } from '../reporters/console.js';

import {
  collectTranslations,
  handleDuplicates,
  maybeReport,
  readWorksheet,
  writeExcel,
  writeLanguages,
} from './convert.helpers.js';

/**
 * Converts JSON localization files to an Excel workbook.
 * Performs validation (structure & presence) and optionally writes the workbook unless dryRun is set.
 *
 * @param {IoAdapter} io Abstraction layer for filesystem & Excel I/O.
 * @param {string} sourcePath Directory containing one or more language JSON files.
 * @param {string} targetFile Output Excel file path.
 * @param {ConvertToExcelOptions} [opts] Conversion options.
 * @param {Reporter} [reporter] Reporter used for optional dry-run report output.
 * @returns {Promise<void>} Resolves on success.
 * @throws {Error} If no JSON files found or IO operations fail.
 * @example
 * await convertToExcelApp(io, 'locales', 'translations.xlsx', { sheetName: 'Translations' }, reporter);
 */
export async function convertToExcelApp(
  io,
  sourcePath,
  targetFile,
  opts = {},
  reporter = defaultConsoleReporter,
) {
  const {
    sheetName = 'Translations',
    dryRun = false,
    languageMap = {},
    report = true,
  } = opts;

  await io.checkFileExists(sourcePath);
  const files = await io.readDirJsonFiles(sourcePath);
  if (files.length === 0) {
    throw new Error(`No JSON files found in directory: ${sourcePath}`);
  }
  const { translations, languages } = collectTranslations(files);
  if (dryRun) {
    maybeReport(translations, languages, reporter, report);
    return;
  }
  await writeExcel(io, targetFile, {
    sheetName,
    translations,
    languages,
    languageMap,
  });
}

/**
 * Converts an Excel workbook to JSON localization files.
 * Reads a worksheet, validates duplicates (optionally failing), and writes per-language JSON unless dryRun.
 *
 * @param {IoAdapter} io Abstraction layer for filesystem & Excel I/O.
 * @param {string} sourceFile Path to Excel workbook.
 * @param {string} targetPath Output directory for JSON files.
 * @param {ConvertToJsonOptions} [opts] Conversion options.
 * @param {Reporter} [reporter] Reporter used for warning messages (duplicates when not failing).
 * @returns {Promise<void>} Resolves on success.
 * @throws {Error} If worksheet missing or duplicate keys present with failOnDuplicates.
 * @example
 * await convertToJsonApp(io, 'translations.xlsx', 'locales', { failOnDuplicates: true });
 */
export async function convertToJsonApp(
  io,
  sourceFile,
  targetPath,
  opts = {},
  reporter = defaultConsoleReporter,
) {
  const {
    sheetName = 'Translations',
    dryRun = false,
    languageMap = {},
    failOnDuplicates = false,
  } = opts;

  await io.checkFileExists(sourceFile);
  if (!dryRun) await io.ensureDirectoryExists(targetPath);

  const ws = await readWorksheet(io, sourceFile, sheetName);
  const { languages, translationsByLanguage, duplicates } =
    readTranslationsFromWorksheet(ws, languageMap);
  handleDuplicates(duplicates, failOnDuplicates, reporter);
  if (dryRun) return;
  await writeLanguages(io, targetPath, languages, translationsByLanguage);
}
