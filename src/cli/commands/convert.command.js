/**
 * @module cli/commands/convert.command
 * Handlers for i18n→Excel and Excel→i18n CLI commands.
 * Responsibilities: resolve paths → run conversion → log result.
 */

import { convertToExcel, convertToJson } from '../../index.js';
import {
  buildCommonOptions,
  resolveExcelToI18nPaths,
  resolveFailOnDuplicates,
  resolveI18nToExcelPaths,
} from '../configResolution.js';
import { FLAG_FAIL_ON_DUP } from '../constants.js';
import {
  logConversionCompleted,
  logConvertExcelToI18n,
  logConvertI18nToExcel,
  logDryRunPlural,
  logDryRunSingle,
} from '../logging.js';

import { createSpinner } from './shared/spinner.js';

/**
 * Run i18n→Excel conversion using resolved paths.
 * @param {Object} options Merged CLI options.
 * @param {boolean} isDryRun Dry-run flag already computed.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} config Runtime validated config (may include languages).
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runI18nToExcel(options, isDryRun, defaultConfig, config) {
  const { sourcePath, targetFile } = resolveI18nToExcelPaths(
    options,
    defaultConfig,
  );
  logConvertI18nToExcel(sourcePath, targetFile);

  const spinner = createSpinner('Converting i18n files to Excel...');
  spinner.start();
  try {
    const common = buildCommonOptions(options, defaultConfig, config, isDryRun);
    await convertToExcel(sourcePath, targetFile, common);
    spinner.stop();

    if (isDryRun) logDryRunSingle();
    else logConversionCompleted(targetFile);
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}

/**
 * Run Excel→i18n conversion using resolved paths.
 * @param {Object} options Merged CLI options.
 * @param {boolean} isDryRun Dry-run flag.
 * @param {Object} defaultConfig Entry defaults.
 * @param {Object} config Runtime validated config.
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runExcelToI18n(options, isDryRun, defaultConfig, config) {
  const { sourceFile, targetPath } = resolveExcelToI18nPaths(
    options,
    defaultConfig,
  );
  logConvertExcelToI18n(sourceFile, targetPath);

  const spinner = createSpinner('Converting Excel to i18n files...');
  spinner.start();
  try {
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
    spinner.stop();

    if (isDryRun) logDryRunPlural();
    else logConversionCompleted(targetPath);
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}
