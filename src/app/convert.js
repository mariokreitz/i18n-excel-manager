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
import { generateDefaultLanguageMap } from '../core/languages/mapping.js';
import { consoleReporter as defaultConsoleReporter } from '../reporters/console.js';

import {
  collectTranslations,
  handleDuplicates,
  maybeReport,
  readAllWorksheets,
  readWorksheet,
  writeExcel,
  writeLanguages,
} from './convert.helpers.js';

/**
 * Resolve the effective reporter from deps.
 * Accepts either a legacy reporter passed directly as the deps arg (has `.print`) or
 * a `{ reporter }` object (new DI style). Falls back to the default console reporter.
 * @param {Reporter|{reporter?: Reporter}|undefined} deps Dependency argument.
 * @returns {Reporter} Resolved reporter.
 * @internal
 */
function resolveReporter(deps) {
  if (typeof deps?.print === 'function') return deps;
  return deps?.reporter ?? defaultConsoleReporter;
}

/**
 * Converts JSON localization files to an Excel workbook.
 *
 * @param {IoAdapter} io Abstraction layer for filesystem & Excel I/O.
 * @param {string} sourcePath Directory containing one or more language JSON files.
 * @param {string} targetFile Output Excel file path.
 * @param {ConvertToExcelOptions} [opts] Conversion options.
 * @param {Reporter|{reporter?: Reporter}} [deps] Injectable dependencies.
 *   Accepts a reporter object directly (legacy) or `{ reporter }` object (new style).
 * @returns {Promise<void>}
 */
export async function convertToExcelApp(
  io,
  sourcePath,
  targetFile,
  opts = {},
  deps = {},
) {
  const reporter = resolveReporter(deps);
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

  const effectiveLanguageMap =
    Object.keys(languageMap).length > 0
      ? languageMap
      : generateDefaultLanguageMap(languages);

  if (dryRun) {
    maybeReport(translations, languages, reporter, report);
    return;
  }
  await writeExcel(io, targetFile, {
    sheetName,
    translations,
    languages,
    languageMap: effectiveLanguageMap,
  });
}

/**
 * Read and merge translations from every worksheet in a workbook.
 * @param {IoAdapter} io IO abstraction.
 * @param {string} sourceFile Path to Excel workbook.
 * @param {Object} languageMap Language code → display name map.
 * @returns {Promise<{languages: string[], translationsByLanguage: Object, duplicates: string[]}>}
 */
async function mergeAllSheets(io, sourceFile, languageMap) {
  const sheets = await readAllWorksheets(io, sourceFile);
  const mergedByLanguage = {};
  const allLanguages = new Set();
  const allDuplicates = [];

  for (const ws of sheets) {
    const { languages, translationsByLanguage, duplicates } =
      readTranslationsFromWorksheet(ws, languageMap);
    for (const lang of languages) {
      allLanguages.add(lang);
      mergedByLanguage[lang] = {
        ...mergedByLanguage[lang],
        ...translationsByLanguage[lang],
      };
    }
    allDuplicates.push(...duplicates);
  }

  return {
    languages: [...allLanguages],
    translationsByLanguage: mergedByLanguage,
    duplicates: allDuplicates,
  };
}

/**
 * Normalize options for convertToJsonApp with defaults applied.
 * @param {ConvertToJsonOptions} opts Raw options.
 * @returns {{sheetName:string,dryRun:boolean,languageMap:Object,failOnDuplicates:boolean,allSheets:boolean}}
 */
function normalizeJsonOpts(opts = {}) {
  return {
    sheetName: opts.sheetName ?? 'Translations',
    dryRun: opts.dryRun ?? false,
    languageMap: opts.languageMap ?? {},
    failOnDuplicates: opts.failOnDuplicates ?? false,
    allSheets: opts.allSheets ?? false,
  };
}

/**
 * Converts an Excel workbook to JSON localization files.
 *
 * @param {IoAdapter} io Abstraction layer for filesystem & Excel I/O.
 * @param {string} sourceFile Path to Excel workbook.
 * @param {string} targetPath Output directory for JSON files.
 * @param {ConvertToJsonOptions} [opts] Conversion options.
 * @param {Reporter|{reporter?: Reporter}} [deps] Injectable dependencies.
 *   Accepts a reporter object directly (legacy) or `{ reporter }` object (new style).
 * @returns {Promise<void>}
 */
export async function convertToJsonApp(io, sourceFile, targetPath, opts, deps) {
  const effectiveReporter = resolveReporter(deps);

  const { sheetName, dryRun, languageMap, failOnDuplicates, allSheets } =
    normalizeJsonOpts(opts);

  await io.checkFileExists(sourceFile);

  const { languages, translationsByLanguage, duplicates } = allSheets
    ? await mergeAllSheets(io, sourceFile, languageMap)
    : readTranslationsFromWorksheet(
        await readWorksheet(io, sourceFile, sheetName),
        languageMap,
      );

  handleDuplicates(duplicates, failOnDuplicates, effectiveReporter);

  if (!dryRun) {
    await io.ensureDirectoryExists(targetPath);
    await writeLanguages(io, targetPath, languages, translationsByLanguage);
  }
}
