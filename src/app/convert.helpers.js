/**
 * Internal helper functions for conversion logic (kept private / not exported via package entrypoint).
 * DRY consolidation of previously inlined utilities from convert.js.
 */
import ExcelJS from 'exceljs';

import { createTranslationWorksheet } from '../core/excel/sheetWrite.js';
import {
  flattenTranslations,
  validateJsonStructure,
} from '../core/json/structure.js';
import { generateTranslationReport } from '../core/report/translationReport.js';
import { safeJoinWithin, validateLanguageCode } from '../io/paths.js';

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
  return { translations, languages: Array.from(langSet).sort() };
}

export function maybeReport(translations, languages, reporter, shouldReport) {
  if (!shouldReport) return;
  const r = generateTranslationReport(translations, languages);
  reporter.print(r);
}

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

export async function readWorksheet(io, sourceFile, sheetName) {
  const workbook = new ExcelJS.Workbook();
  await io.readWorkbook(sourceFile, workbook);
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`Worksheet "${sheetName}" not found`);
  return ws;
}

export function handleDuplicates(duplicates, failOnDuplicates, reporter) {
  if (duplicates.length === 0) return;
  const msg = `Duplicate keys detected in Excel: ${duplicates.join(', ')}`;
  if (failOnDuplicates) throw new Error(msg);
  reporter.warn(msg);
}

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
