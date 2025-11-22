/**
 * @module cli/logging
 * Chalk-based output helpers for consistent CLI messaging.
 */

import chalk from 'chalk';

import {
  MSG_CONVERSION_COMPLETED_PREFIX,
  MSG_DRY_RUN_PLURAL,
  MSG_DRY_RUN_SINGLE,
} from './constants.js';

/**
 * Log start of i18n->Excel conversion.
 * @param {string} sourcePath Source JSON directory.
 * @param {string} targetFile Destination Excel file.
 * @returns {void}
 */
export function logConvertI18nToExcel(sourcePath, targetFile) {
  console.log(
    chalk.blue(`Converting i18n files from ${sourcePath} to ${targetFile}...`),
  );
}

/**
 * Log start of Excel->i18n conversion.
 * @param {string} sourceFile Source Excel file path.
 * @param {string} targetPath Target directory for JSON files.
 * @returns {void}
 */
export function logConvertExcelToI18n(sourceFile, targetPath) {
  console.log(
    chalk.blue(`Converting Excel from ${sourceFile} to ${targetPath}...`),
  );
}

/**
 * Log dry-run single-file message.
 * @returns {void}
 */
export function logDryRunSingle() {
  console.log(chalk.yellow(MSG_DRY_RUN_SINGLE));
}

/**
 * Log dry-run multi-file message.
 * @returns {void}
 */
export function logDryRunPlural() {
  console.log(chalk.yellow(MSG_DRY_RUN_PLURAL));
}

/**
 * Log conversion completion.
 * @param {string} target Target path written.
 * @returns {void}
 */
export function logConversionCompleted(target) {
  console.log(chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${target}`));
}

/**
 * Log formatted error message (red prefix).
 * @param {unknown} err Error or message value.
 * @returns {void}
 */
export function logError(err) {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? err.message
      : String(err);
  console.error(chalk.red(`❌ Error: ${message}`));
}
