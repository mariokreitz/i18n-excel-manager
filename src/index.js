/**
 * @fileoverview Main entry point for the i18n-excel-manager library.
 * Provides high-level functions for converting between Excel and JSON formats,
 * analyzing codebases for translation issues, and auto-translating missing keys.
 * @module i18n-excel-manager
 * @author Mario Kreitz
 * @license MIT
 */

/**
 * @typedef {import('./types.js').IoAdapter} IoAdapter
 * @typedef {import('./types.js').Reporter} Reporter
 * @typedef {import('./types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('./types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

import path from 'node:path';

import { analyzeApp } from './app/analyze.js';
import { convertToExcelApp, convertToJsonApp } from './app/convert.js';
import { translateApp } from './app/translate.js';
import * as ioExcel from './io/excel.js';
import * as ioFs from './io/fs.js';
import { consoleReporter } from './reporters/console.js';

const defaultIo = {
  checkFileExists: ioFs.checkFileExists,
  ensureDirectoryExists: ioFs.ensureDirectoryExists,
  readDirJsonFiles: ioFs.readDirJsonFiles,
  writeJsonFile: ioFs.writeJsonFile,
  readWorkbook: ioExcel.readWorkbook,
  writeWorkbook: ioExcel.writeWorkbook,
  Excel: ioExcel.Excel, // Expose low-level Excel object for custom operations
  dirname: path.dirname,
};

/**
 * Converts JSON localization files to an Excel workbook.
 * @param {string} sourcePath Path to directory containing JSON files (or a single JSON file).
 * @param {string} targetFile Destination Excel file path.
 * @param {ConvertToExcelOptions} [options] Conversion options.
 * @returns {Promise<void>} Resolves when conversion completes.
 */
export async function convertToExcel(sourcePath, targetFile, options = {}) {
  return convertToExcelApp(
    defaultIo,
    sourcePath,
    targetFile,
    options,
    consoleReporter,
  );
}

/**
 * Converts an Excel workbook to JSON localization files.
 * @param {string} sourceFile Path to the Excel file.
 * @param {string} targetPath Directory path where JSON files will be written.
 * @param {ConvertToJsonOptions} [options] Conversion options.
 * @returns {Promise<void>} Resolves when conversion completes.
 */
export async function convertToJson(sourceFile, targetPath, options = {}) {
  return convertToJsonApp(
    defaultIo,
    sourceFile,
    targetPath,
    options,
    consoleReporter,
  );
}

/**
 * Analyzes the codebase for missing and unused translation keys.
 *
 * Scans source code files for translation key usage and compares against
 * defined keys in JSON translation files to identify discrepancies.
 *
 * @param {Object} options - Analysis options.
 * @param {string} options.sourcePath - Path to the i18n JSON directory.
 * @param {string} [options.codePattern='**\/*.{ts,js,html}'] - Glob pattern for source files.
 * @returns {Promise<{totalCodeKeys: number, fileReports: Object}>} Analysis report with missing/unused keys.
 * @example
 * const report = await analyze({
 *   sourcePath: './public/assets/i18n',
 *   codePattern: 'src/**\/*.ts'
 * });
 */
export async function analyze(options = {}) {
  return analyzeApp(defaultIo, options);
}

/**
 * Auto-translates missing keys in an Excel workbook using AI.
 *
 * Uses OpenAI API to translate missing values from a source language
 * to target languages defined in the Excel worksheet columns.
 *
 * @param {Object} options - Translation options.
 * @param {string} options.input - Path to the Excel file.
 * @param {string} options.apiKey - OpenAI API key.
 * @param {string} [options.sourceLang='en'] - Source language code.
 * @param {string} [options.model='gpt-4o-mini'] - OpenAI model to use.
 * @param {Object<string, string>} [options.languageMap] - Language code to display name mapping.
 * @returns {Promise<void>} Resolves when translation is complete.
 * @throws {Error} If API key is missing or translation fails.
 * @example
 * await translate({
 *   input: './translations.xlsx',
 *   apiKey: 'sk-...',
 *   sourceLang: 'en'
 * });
 */
export async function translate(options) {
  return translateApp(defaultIo, options);
}

export { convertToExcelApp, convertToJsonApp } from './app/convert.js';
export { analyzeApp } from './app/analyze.js';
export { consoleReporter } from './reporters/console.js';
export { jsonFileReporter } from './reporters/json.js';
export { loadValidatedConfig } from './io/config.js';
