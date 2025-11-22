/**
 * Application logic for converting between JSON and Excel formats for internationalization.
 * Provides functions to convert JSON files to Excel workbooks and vice versa.
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
 * @param {Object} io - IO utilities object containing file system and Excel operations.
 * @param {string} sourcePath - Path to the directory containing JSON files or a single JSON file.
 * @param {string} targetFile - Path where the Excel file will be written.
 * @param {Object} [opts={}] - Conversion options.
 * @param {string} [opts.sheetName='Translations'] - Name of the worksheet to create.
 * @param {boolean} [opts.dryRun=false] - If true, performs validation without writing files.
 * @param {Object} [opts.languageMap={}] - Mapping of language codes for customization.
 * @param {boolean} [opts.report=true] - If true, generates and prints a translation report.
 * @param {Function} [reporter=defaultConsoleReporter] - Reporter function for logging.
 * @returns {Promise<void>} Resolves when conversion is complete.
 * @throws {Error} If no JSON files are found or if file operations fail.
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
 * @param {Object} io - IO utilities object containing file system and Excel operations.
 * @param {string} sourceFile - Path to the Excel file to convert.
 * @param {string} targetPath - Path to the directory where JSON files will be written.
 * @param {Object} [opts={}] - Conversion options.
 * @param {string} [opts.sheetName='Translations'] - Name of the worksheet to read from.
 * @param {boolean} [opts.dryRun=false] - If true, performs validation without writing files.
 * @param {Object} [opts.languageMap={}] - Mapping of language codes for customization.
 * @param {boolean} [opts.failOnDuplicates=false] - If true, throws error on duplicate keys.
 * @param {Function} [reporter=defaultConsoleReporter] - Reporter function for logging.
 * @returns {Promise<void>} Resolves when conversion is complete.
 * @throws {Error} If worksheet not found, duplicate keys (if failOnDuplicates), or file operations fail.
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
