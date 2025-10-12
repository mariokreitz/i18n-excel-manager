/**
 * Application logic for converting between JSON and Excel formats for internationalization.
 * Provides functions to convert JSON files to Excel workbooks and vice versa.
 */

import ExcelJS from 'exceljs';

import { readTranslationsFromWorksheet } from '../core/excel/sheetRead.js';
import { createTranslationWorksheet } from '../core/excel/sheetWrite.js';
import {
  flattenTranslations,
  validateJsonStructure,
} from '../core/json/structure.js';
import { generateTranslationReport } from '../core/report/translationReport.js';
import { safeJoinWithin, validateLanguageCode } from '../io/paths.js';
import { consoleReporter as defaultConsoleReporter } from '../reporters/console.js';

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

  const languages = Array.from(langSet).sort();

  if (dryRun) {
    if (report) {
      const r = generateTranslationReport(translations, languages);
      reporter.print(r);
    }
    return;
  }

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

  const workbook = new ExcelJS.Workbook();
  await io.readWorkbook(sourceFile, workbook);

  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`Worksheet "${sheetName}" not found`);

  const { languages, translationsByLanguage, duplicates } =
    readTranslationsFromWorksheet(ws, languageMap);

  if (duplicates.length > 0) {
    const msg = `Duplicate keys detected in Excel: ${duplicates.join(', ')}`;
    if (failOnDuplicates) throw new Error(msg);
    reporter.warn(msg);
  }

  if (!dryRun) {
    for (const lang of languages) {
      validateLanguageCode(lang);
      const filePath = safeJoinWithin(targetPath, `${lang}.json`);
      await io.writeJsonFile(filePath, translationsByLanguage[lang]);
    }
  }
}
