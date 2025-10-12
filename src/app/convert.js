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
