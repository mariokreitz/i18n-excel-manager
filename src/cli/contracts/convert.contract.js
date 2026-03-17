/**
 * @module cli/contracts/convert.contract
 * Command contract normalization for conversion commands.
 */

import {
  buildCommonOptions,
  resolveExcelToI18nPaths,
  resolveI18nToExcelPaths,
} from '../configResolution.js';
import { FLAG_FAIL_ON_DUP } from '../constants.js';

/**
 * Normalize shared output flags used by CLI command handlers.
 * @param {Object} options Raw merged options.
 * @returns {Object} Options with explicit `format` and boolean `quiet` values.
 * @internal
 */
function normalizeCommonOutput(options) {
  return {
    ...options,
    format: options.format ?? 'text',
    quiet: options.quiet === true,
  };
}

/**
 * Normalize i18n->Excel command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} runtimeConfig Runtime validated config.
 * @param {boolean} isDryRun Dry-run flag.
 * @returns {Object} Normalized options.
 */
export function normalizeI18nToExcelContract(
  options,
  defaultConfig,
  runtimeConfig,
  isDryRun,
) {
  const normalized = normalizeCommonOutput(options);
  const { sourcePath, targetFile } = resolveI18nToExcelPaths(
    normalized,
    defaultConfig,
  );

  return {
    ...normalized,
    sourcePath,
    targetFile,
    common: buildCommonOptions(
      normalized,
      defaultConfig,
      runtimeConfig,
      isDryRun,
    ),
  };
}

/**
 * Assert invariants for i18n->Excel conversion.
 * @param {Object} options Normalized command options.
 * @returns {void}
 */
export function assertI18nToExcelInvariants(options) {
  if (!options.sourcePath) {
    throw new Error('Please provide a source path using --input');
  }
  if (!options.targetFile) {
    throw new Error('Please provide an output file using --output');
  }
}

/**
 * Normalize Excel->i18n command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} runtimeConfig Runtime validated config.
 * @param {boolean} isDryRun Dry-run flag.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @returns {Object} Normalized options.
 */
export function normalizeExcelToI18nContract(
  options,
  defaultConfig,
  runtimeConfig,
  isDryRun,
  runtime,
) {
  const normalized = normalizeCommonOutput(options);
  const { sourceFile, targetPath } = resolveExcelToI18nPaths(
    normalized,
    defaultConfig,
  );
  const failOnDuplicates =
    normalized.failOnDuplicates === true ||
    (Array.isArray(runtime?.argv) && runtime.argv.includes(FLAG_FAIL_ON_DUP));

  return {
    ...normalized,
    sourceFile,
    targetPath,
    failOnDuplicates,
    common: buildCommonOptions(
      normalized,
      defaultConfig,
      runtimeConfig,
      isDryRun,
    ),
  };
}

/**
 * Assert invariants for Excel->i18n conversion.
 * @param {Object} options Normalized command options.
 * @returns {void}
 */
export function assertExcelToI18nInvariants(options) {
  if (!options.sourceFile) {
    throw new Error('Please provide the Excel file path using --input');
  }
  if (!options.targetPath) {
    throw new Error('Please provide an output path using --output');
  }
}
