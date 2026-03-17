/**
 * @module cli/commands/index
 * Central dispatcher for all CLI commands.
 * Re-exports command runners and provides processCliOptions + dispatchCommand.
 *
 * This module replaces the monolithic src/cli/commands.js.
 * The old commands.js is kept as a backward-compat shim.
 */

import { loadConfigOptions } from '../configLoader.js';
import { computeIsDryRun } from '../helpers.js';
import { runInitCommand } from '../init.js';
import { logError } from '../logging.js';
import { mergeCliOptions } from '../options.js';

import { runAnalyze, runAnalyzeWatch } from './analyze.command.js';
import { runExcelToI18n, runI18nToExcel } from './convert.command.js';
import { runTranslate } from './translate.command.js';

export { runAnalyze, runAnalyzeWatch } from './analyze.command.js';
export { runExcelToI18n, runI18nToExcel } from './convert.command.js';
export { runTranslate } from './translate.command.js';

/**
 * Dispatch a command based on merged options.
 * @param {Object} mergedOptions Merged CLI options.
 * @param {boolean} isDryRun Dry-run flag.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} config Runtime validated config.
 * @returns {Promise<void>}
 */
async function dispatchCommand(mergedOptions, isDryRun, defaultConfig, config) {
  if (mergedOptions.i18nToExcel) {
    return runI18nToExcel(mergedOptions, isDryRun, defaultConfig, config);
  }
  if (mergedOptions.excelToI18n) {
    return runExcelToI18n(mergedOptions, isDryRun, defaultConfig, config);
  }
  if (mergedOptions.init) {
    return runInitCommand(mergedOptions, config, defaultConfig);
  }
  if (mergedOptions.analyze) {
    if (mergedOptions.watch) {
      return runAnalyzeWatch(mergedOptions);
    }
    return runAnalyze(mergedOptions);
  }
  if (mergedOptions.translate) {
    return runTranslate(mergedOptions);
  }
}

/**
 * Process CLI options and dispatch chosen command.
 * @param {Object} options Raw commander options.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} config Runtime validated config.
 * @param {(obj:Object)=>Object} validateConfigObject Validation transformer.
 * @returns {Promise<void>} Resolves when processing is complete; exits on error.
 */
export async function processCliOptions(
  options,
  defaultConfig,
  config,
  validateConfigObject,
) {
  try {
    const configOptions = loadConfigOptions(options, validateConfigObject);
    const mergedOptions = mergeCliOptions(
      options ?? {},
      configOptions,
      defaultConfig,
      config,
    );
    const isDryRun = computeIsDryRun(mergedOptions);

    await dispatchCommand(mergedOptions, isDryRun, defaultConfig, config);
  } catch (error) {
    logError(error);
    process.exit(1); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
