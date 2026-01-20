/**
 * @fileoverview Global JSDoc typedefs for the i18n-excel-manager project.
 * This file contains shared type descriptions referenced across modules.
 * It intentionally exports nothing meaningful; it exists purely for documentation.
 * @module types
 */

/**
 * IO adapter abstraction used by conversion functions.
 * Provides a consistent interface for filesystem and Excel operations,
 * enabling testability through dependency injection.
 *
 * @typedef {Object} IoAdapter
 * @property {(filePath: string) => Promise<void>} checkFileExists - Ensures a file exists or rejects with an error.
 * @property {(dirPath: string) => Promise<void>} ensureDirectoryExists - Creates directory recursively if it doesn't exist.
 * @property {(dir: string) => Promise<Array<{name: string, data: Object}>>} readDirJsonFiles - Reads and parses all JSON files from a directory.
 * @property {(filePath: string, workbook: Object) => Promise<void>} readWorkbook - Reads an Excel workbook from disk into the provided workbook object.
 * @property {(filePath: string, workbook: Object) => Promise<void>} writeWorkbook - Writes an Excel workbook to disk.
 * @property {(filePath: string, data: unknown) => Promise<void>} writeJsonFile - Serializes and writes JSON data to a file.
 * @property {(p: string) => string} dirname - Derives directory name from a path (path.dirname).
 */

/**
 * Reporter interface for outputting conversion or validation results.
 * Allows customization of how reports are displayed (console, file, etc.).
 *
 * @typedef {Object} Reporter
 * @property {(report: TranslationReport) => void | Promise<void>} print - Prints or persists a translation report.
 * @property {(message: string) => void} warn - Emits a warning message.
 */

/**
 * Structure of a translation report containing validation results.
 *
 * @typedef {Object} TranslationReport
 * @property {Array<{key: string, lang: string}>} missing - Missing translation entries (key exists but value is empty).
 * @property {string[]} duplicates - Duplicate key names detected in Excel worksheet.
 * @property {Array<{key: string, placeholders: Object<string, Set<string>>}>} placeholderInconsistencies - Keys with mismatched placeholders across languages.
 */

/**
 * Options for converting JSON files to Excel format.
 *
 * @typedef {Object} ConvertToExcelOptions
 * @property {string} [sheetName='Translations'] - Name of the worksheet to create.
 * @property {boolean} [dryRun=false] - If true, simulates conversion without writing files.
 * @property {Object<string, string>} [languageMap] - Maps language codes to display names for headers.
 * @property {boolean} [report=true] - Whether to generate a translation report in dry-run mode.
 * @example
 * {
 *   sheetName: 'MyTranslations',
 *   dryRun: false,
 *   languageMap: { en: 'English', de: 'German' }
 * }
 */

/**
 * Options for converting Excel files to JSON format.
 *
 * @typedef {Object} ConvertToJsonOptions
 * @property {string} [sheetName='Translations'] - Name of the worksheet to read from.
 * @property {boolean} [dryRun=false] - If true, simulates conversion without writing files.
 * @property {Object<string, string>} [languageMap] - Maps language codes to display names for header resolution.
 * @property {boolean} [failOnDuplicates=false] - If true, throws an error when duplicate keys are detected.
 * @example
 * {
 *   sheetName: 'Translations',
 *   failOnDuplicates: true,
 *   languageMap: { en: 'English', de: 'German' }
 * }
 */

// Ensure this is treated as an ES module
export const TYPE_DEFINITIONS = true;
