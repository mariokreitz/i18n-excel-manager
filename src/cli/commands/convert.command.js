/**
 * @module cli/commands/convert.command
 * Handlers for i18n→Excel and Excel→i18n CLI commands.
 * Responsibilities: resolve paths → run conversion → log result.
 */

import { convertToExcel, convertToJson } from '../../index.js';
import {
  logConversionCompleted,
  logConvertExcelToI18n,
  logConvertI18nToExcel,
  logDryRunPlural,
  logDryRunSingle,
} from '../logging.js';
import { defaultRuntime } from '../runtime.js';

import { createSpinner } from './shared/spinner.js';

/**
 * Run i18n→Excel conversion using resolved paths.
 * @param {Object} options Normalized i18n->Excel contract options.
 * @param {import('../runtime.js').Runtime} [runtime=defaultRuntime()] Runtime abstraction.
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runI18nToExcel(options, runtime = defaultRuntime()) {
  const { sourcePath, targetFile } = options;
  const effectiveOptions = options;
  logConvertI18nToExcel(sourcePath, targetFile, runtime, effectiveOptions);

  const spinner = createSpinner(
    'Converting i18n files to Excel...',
    runtime,
    effectiveOptions,
  );
  spinner.start();
  try {
    await convertToExcel(sourcePath, targetFile, effectiveOptions.common);
    spinner.stop();

    if (effectiveOptions.common.dryRun) {
      logDryRunSingle(runtime, effectiveOptions);
    } else {
      logConversionCompleted(targetFile, runtime, effectiveOptions);
    }
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}

/**
 * Run Excel→i18n conversion using resolved paths.
 * @param {Object} options Normalized Excel->i18n contract options.
 * @param {import('../runtime.js').Runtime} [runtime=defaultRuntime()] Runtime abstraction.
 * @returns {Promise<void>}
 * @throws {Error} Propagates errors from conversion layer.
 */
export async function runExcelToI18n(options, runtime = defaultRuntime()) {
  const { sourceFile, targetPath } = options;
  const effectiveOptions = options;
  logConvertExcelToI18n(sourceFile, targetPath, runtime, effectiveOptions);

  const spinner = createSpinner(
    'Converting Excel to i18n files...',
    runtime,
    effectiveOptions,
  );
  spinner.start();
  try {
    await convertToJson(sourceFile, targetPath, {
      ...effectiveOptions.common,
      failOnDuplicates: effectiveOptions.failOnDuplicates,
    });
    spinner.stop();

    if (effectiveOptions.common.dryRun) {
      logDryRunPlural(runtime, effectiveOptions);
    } else {
      logConversionCompleted(targetPath, runtime, effectiveOptions);
    }
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}
