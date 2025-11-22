/**
 * CLI command handlers for non-interactive mode.
 * Responsibilities: orchestrate conversion calls and delegate config+logging to helpers.
 * @module cli/commands
 */

// Parent-level internal modules
import { convertToExcel, convertToJson } from '../index.js';

// Same-directory utilities and constants
import { loadConfigOptions } from './configLoader.js';
import { FLAG_FAIL_ON_DUP } from './constants.js';
import { computeIsDryRun } from './helpers.js';
import { runInitCommand } from './init.js';
import {
  logConversionCompleted,
  logConvertExcelToI18n,
  logConvertI18nToExcel,
  logDryRunPlural,
  logDryRunSingle,
  logError,
} from './logging.js';
import { mergeCliOptions } from './options.js';
import {
  buildCommonOptions,
  resolveExcelToI18nPaths,
  resolveFailOnDuplicates,
  resolveI18nToExcelPaths,
} from './params.js';

/**
 * Runs the i18n-to-Excel conversion command.
 *
 * @param {object} options - Command options.
 * @param {boolean} isDryRun - Whether dry-run is enabled.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} config - Configuration object with languages mapping.
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runI18nToExcel(options, isDryRun, defaultConfig, config) {
  const { sourcePath, targetFile } = resolveI18nToExcelPaths(
    options,
    defaultConfig,
  );
  logConvertI18nToExcel(sourcePath, targetFile);

  const common = buildCommonOptions(options, defaultConfig, config, isDryRun);
  await convertToExcel(sourcePath, targetFile, common);

  if (isDryRun) logDryRunSingle();
  else logConversionCompleted(targetFile);
}

/**
 * Runs the Excel-to-i18n conversion command.
 *
 * @param {object} options - Command options.
 * @param {boolean} isDryRun - Whether dry-run is enabled.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} config - Configuration object with languages mapping.
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runExcelToI18n(options, isDryRun, defaultConfig, config) {
  const { sourceFile, targetPath } = resolveExcelToI18nPaths(
    options,
    defaultConfig,
  );
  logConvertExcelToI18n(sourceFile, targetPath);

  const common = buildCommonOptions(options, defaultConfig, config, isDryRun);
  const failOnDuplicates = resolveFailOnDuplicates(
    options,
    process.argv,
    FLAG_FAIL_ON_DUP,
  );
  await convertToJson(sourceFile, targetPath, {
    ...common,
    failOnDuplicates,
  });

  if (isDryRun) logDryRunPlural();
  else logConversionCompleted(targetPath);
}

/**
 * Processes CLI parameters for non-interactive mode.
 * - Loads config file if specified and validates it.
 * - Merges options with correct precedence and computes dry-run.
 * - Dispatches to the appropriate command handler.
 *
 * @param {object} options - Commander options.
 * @param {object} defaultConfig - Default configuration (entry defaults).
 * @param {object} config - Validated runtime config (includes languages).
 * @param {(obj: object) => object} validateConfigObject - Config validator.
 * @returns {Promise<void>} Resolves when processing is complete; exits on error.
 */
export async function processCliOptions(
  options,
  defaultConfig,
  config,
  validateConfigObject,
) {
  try {
    // Load and validate config options from file (if provided)
    const configOptions = loadConfigOptions(options, validateConfigObject);

    // Merge precedence: CLI > file defaults > entry defaults
    const mergedOptions = mergeCliOptions(
      options || {},
      configOptions,
      defaultConfig,
      config,
    );

    const isDryRun = computeIsDryRun(mergedOptions);

    if (mergedOptions.i18nToExcel) {
      await runI18nToExcel(mergedOptions, isDryRun, defaultConfig, config);
    } else if (mergedOptions.excelToI18n) {
      await runExcelToI18n(mergedOptions, isDryRun, defaultConfig, config);
    } else if (mergedOptions.init) {
      await runInitCommand(mergedOptions, config, defaultConfig);
    }
  } catch (error) {
    logError(error);
    process.exit(1); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
