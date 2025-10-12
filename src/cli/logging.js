/**
 * Centralized logging helpers for CLI messages.
 * @module cli/logging
 */

import chalk from 'chalk';

import {
  MSG_CONVERSION_COMPLETED_PREFIX,
  MSG_DRY_RUN_PLURAL,
  MSG_DRY_RUN_SINGLE,
} from './constants.js';

/**
 * Log start of i18n -> Excel conversion.
 * @param {string} sourcePath - Directory with JSON files.
 * @param {string} targetFile - Output Excel path.
 * @returns {void}
 */
export function logConvertI18nToExcel(sourcePath, targetFile) {
  console.log(
    chalk.blue(`Converting i18n files from ${sourcePath} to ${targetFile}...`),
  );
}

/**
 * Log start of Excel -> i18n conversion.
 * @param {string} sourceFile - Source Excel file.
 * @param {string} targetPath - Target directory for JSON files.
 * @returns {void}
 */
export function logConvertExcelToI18n(sourceFile, targetPath) {
  console.log(
    chalk.blue(`Converting Excel from ${sourceFile} to ${targetPath}...`),
  );
}

/**
 * Log a single-file dry-run message.
 * @returns {void}
 */
export function logDryRunSingle() {
  console.log(chalk.yellow(MSG_DRY_RUN_SINGLE));
}

/**
 * Log a multi-file dry-run message.
 * @returns {void}
 */
export function logDryRunPlural() {
  console.log(chalk.yellow(MSG_DRY_RUN_PLURAL));
}

/**
 * Log a successful conversion completion message.
 * @param {string} target - Target file or directory path.
 * @returns {void}
 */
export function logConversionCompleted(target) {
  console.log(chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${target}`));
}

/**
 * Log a formatted error line.
 * @param {unknown} err - Error or message.
 * @returns {void}
 */
export function logError(err) {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? err.message
      : String(err);
  console.error(chalk.red(`❌ Error: ${message}`));
}
