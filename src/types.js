/**
 * Global JSDoc typedefs for the i18n-excel-manager project.
 * This file contains shared type descriptions referenced across modules.
 * It intentionally exports nothing; it exists purely for documentation.
 * @module types
 */

/**
 * IO adapter abstraction used by conversion functions.
 * @typedef {Object} IoAdapter
 * @property {(filePath:string)=>Promise<void>} checkFileExists Ensures a file exists or rejects.
 * @property {(dirPath:string)=>Promise<void>} ensureDirectoryExists Ensures directory exists.
 * @property {(dir:string)=>Promise<Array<{name:string,data:Object}>>} readDirJsonFiles Reads JSON files from a directory.
 * @property {(filePath:string, workbook:Object)=>Promise<void>} readWorkbook Reads an Excel workbook from disk.
 * @property {(filePath:string, workbook:Object)=>Promise<void>} writeWorkbook Writes an Excel workbook to disk.
 * @property {(filePath:string, data:any)=>Promise<void>} writeJsonFile Writes JSON data to disk.
 * @property {(p:string)=>string} dirname Derives directory name from a path.
 */

/**
 * Reporter interface used to output conversion or validation results.
 * @typedef {Object} Reporter
 * @property {(report:TranslationReport)=>void|Promise<void>} print Prints or persists a translation report.
 * @property {(message:string)=>void} warn Emits a warning message.
 */

/**
 * Structure of a translation report.
 * @typedef {Object} TranslationReport
 * @property {Array<{key:string,lang:string}>} missing Missing translation entries.
 * @property {string[]} duplicates Duplicate key names (Excel side detection).
 * @property {Array<{key:string,placeholders:Object<string,Set<string>>}>} placeholderInconsistencies Placeholder mismatch entries.
 */

/**
 * Options for converting JSON -> Excel.
 * @typedef {Object} ConvertToExcelOptions
 * @property {string} [sheetName="Translations"] Name of worksheet.
 * @property {boolean} [dryRun=false] Simulate only (skip file write).
 * @property {Object<string,string>} [languageMap] Map code -> display name.
 * @property {boolean} [report=true] Whether to generate a translation report in dryRun.
 */

/**
 * Options for converting Excel -> JSON.
 * @typedef {Object} ConvertToJsonOptions
 * @property {string} [sheetName="Translations"] Name of worksheet to read.
 * @property {boolean} [dryRun=false] Simulate only (skip file writes).
 * @property {Object<string,string>} [languageMap] Map code -> display name or overrides.
 * @property {boolean} [failOnDuplicates=false] Throw on duplicate key detection in sheet.
 */

// Ensure this is treated as an ES module
export const TYPE_DEFINITIONS = true;
