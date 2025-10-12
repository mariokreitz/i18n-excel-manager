// Public API surface
// Retains existing function names for compatibility and re-exports reporter helpers for extensibility

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

export async function convertToExcel(sourcePath, targetFile, options = {}) {
  return convertToExcelApp(
    defaultIo,
    sourcePath,
    targetFile,
    options,
    consoleReporter,
  );
}

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
