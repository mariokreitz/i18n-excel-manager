/**
 * Main entry point for the i18n-excel-manager library.
 * Provides high-level functions for converting between Excel and JSON formats for internationalization.
 * Also exports advanced APIs and utilities for custom integrations.
 * @module index
 * Public entrypoint exporting high-level conversion APIs.
 *
 * High-level functions:
 * - convertToExcel(sourcePath, targetFile, options)
 * - convertToJson(sourceFile, targetPath, options)
 *
 * @typedef {import('./types.js').IoAdapter} IoAdapter
 * @typedef {import('./types.js').Reporter} Reporter
 * @typedef {import('./types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('./types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

import path from 'node:path';

import { convertToExcelApp, convertToJsonApp } from './app/convert.js';
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

export { convertToExcelApp, convertToJsonApp } from './app/convert.js';
export { consoleReporter } from './reporters/console.js';
export { jsonFileReporter } from './reporters/json.js';
export { loadValidatedConfig } from './io/config.js';
