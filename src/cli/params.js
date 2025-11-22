/**
 * CLI parameter resolution helpers to keep command handlers simple.
 * @module cli/params
 */

import {
  buildCommonOptions as bCommon,
  resolveExcelToI18nPaths as rE2I,
  resolveFailOnDuplicates as rFailDup,
  resolveI18nToExcelPaths as rI2E,
} from './configResolution.js';

/**
 * Resolve source and target paths for i18n->Excel conversion.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @returns {{sourcePath: string, targetFile: string}}
 */
export function resolveI18nToExcelPaths(options, defaultConfig) {
  return rI2E(options, defaultConfig);
}

/**
 * Resolve source and target paths for Excel->i18n conversion.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @returns {{sourceFile: string, targetPath: string}}
 */
export function resolveExcelToI18nPaths(options, defaultConfig) {
  return rE2I(options, defaultConfig);
}

/**
 * Build shared conversion options (sheetName, dryRun, languageMap) for both directions.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} runtimeConfig - Runtime validated config (may include languages).
 * @param {boolean} isDryRun - Dry run flag.
 * @returns {{sheetName: string, dryRun: boolean, languageMap?: object, report?: boolean}}
 */
export function buildCommonOptions(
  options,
  defaultConfig,
  runtimeConfig,
  isDryRun,
) {
  return bCommon(options, defaultConfig, runtimeConfig, isDryRun);
}

/**
 * Resolve fail-on-duplicates flag combining CLI option and argv flag.
 * @param {object} options - CLI options.
 * @param {string[]} argv - Process argv array.
 * @param {string} flagLiteral - The long flag literal to check in argv.
 * @returns {boolean}
 */
export function resolveFailOnDuplicates(options, argv, flagLiteral) {
  return rFailDup(options, argv, flagLiteral);
}
