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
 * Determine whether output is machine-readable and should avoid decorative stdout logs.
 * @param {{format?: string}|undefined} options CLI options.
 * @returns {boolean} True for JSON/SARIF output modes.
 * @internal
 */
function isMachineFormat(options) {
  return options?.format === 'json' || options?.format === 'sarif';
}

/**
 * Select the active output sinks for current runtime and format.
 * In machine formats, informational messages are routed to stderr.
 *
 * @param {import('./runtime.js').Runtime|undefined} runtime Runtime abstraction.
 * @param {{format?: string}|undefined} options CLI options.
 * @returns {{log: (...args: unknown[]) => void, warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Output sinks.
 * @internal
 */
function out(runtime, options) {
  const infoSink = isMachineFormat(options)
    ? (runtime?.error ?? console.error)
    : (runtime?.log ?? console.log);
  return {
    log: infoSink,
    warn: runtime?.warn ?? console.warn,
    error: runtime?.error ?? console.error,
  };
}

/**
 * Check whether non-error informational logs should be suppressed.
 * @param {{quiet?: boolean}|undefined} options CLI options.
 * @returns {boolean} True when quiet mode is enabled.
 * @internal
 */
function shouldSkipInfo(options) {
  return options?.quiet === true;
}

/**
 * Log start of i18n->Excel conversion.
 * @param {string} sourcePath Source JSON directory.
 * @param {string} targetFile Destination Excel file.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] CLI options.
 * @returns {void}
 */
export function logConvertI18nToExcel(
  sourcePath,
  targetFile,
  runtime,
  options,
) {
  if (shouldSkipInfo(options)) return;
  out(runtime, options).log(
    chalk.blue(`Converting i18n files from ${sourcePath} to ${targetFile}...`),
  );
}

/**
 * Log start of Excel->i18n conversion.
 * @param {string} sourceFile Source Excel file path.
 * @param {string} targetPath Target directory for JSON files.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] CLI options.
 * @returns {void}
 */
export function logConvertExcelToI18n(
  sourceFile,
  targetPath,
  runtime,
  options,
) {
  if (shouldSkipInfo(options)) return;
  out(runtime, options).log(
    chalk.blue(`Converting Excel from ${sourceFile} to ${targetPath}...`),
  );
}

/**
 * Log dry-run single-file message.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] CLI options.
 * @returns {void}
 */
export function logDryRunSingle(runtime, options) {
  if (shouldSkipInfo(options)) return;
  out(runtime, options).log(chalk.yellow(MSG_DRY_RUN_SINGLE));
}

/**
 * Log dry-run multi-file message.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] CLI options.
 * @returns {void}
 */
export function logDryRunPlural(runtime, options) {
  if (shouldSkipInfo(options)) return;
  out(runtime, options).log(chalk.yellow(MSG_DRY_RUN_PLURAL));
}

/**
 * Log conversion completion.
 * @param {string} target Target path written.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] CLI options.
 * @returns {void}
 */
export function logConversionCompleted(target, runtime, options) {
  if (shouldSkipInfo(options)) return;
  out(runtime, options).log(
    chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${target}`),
  );
}

/**
 * Log formatted error message (red prefix).
 * @param {unknown} err Error or message value.
 * @param {import('./runtime.js').Runtime} runtime Runtime abstraction.
 * @returns {void}
 */
export function logError(err, runtime) {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? err.message
      : String(err);
  out(runtime).error(chalk.red(`❌ Error: ${message}`));
}
