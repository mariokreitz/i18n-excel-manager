/**
 * Main entry point for the i18n-excel-manager library.
 * Provides high-level functions for converting between Excel and JSON formats for internationalization.
 * Also exports advanced APIs and utilities for custom integrations.
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
 * @param {string} sourcePath - Path to the directory containing JSON files or a single JSON file.
 * @param {string} targetFile - Path where the Excel file will be written.
 * @param {Object} [options={}] - Conversion options.
 * @returns {Promise<void>} Resolves when conversion is complete.
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
 * @param {string} sourceFile - Path to the Excel file to convert.
 * @param {string} targetPath - Path to the directory where JSON files will be written.
 * @param {Object} [options={}] - Conversion options.
 * @returns {Promise<void>} Resolves when conversion is complete.
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

// Optional advanced exports
export { convertToExcelApp, convertToJsonApp } from './app/convert.js';
export { consoleReporter } from './reporters/console.js';
export { jsonFileReporter } from './reporters/json.js';
export { loadValidatedConfig } from './io/config.js';
