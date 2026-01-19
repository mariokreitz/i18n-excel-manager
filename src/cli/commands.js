/**
 * CLI command handlers for non-interactive mode.
 * Responsibilities: orchestrate conversion calls and delegate config+logging to helpers.
 * @module cli/commands
 * Non-interactive command orchestrators for the CLI.
 * @typedef {import('../types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('../types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

// Parent-level internal modules
import chalk from 'chalk';

import { convertToExcel, convertToJson, analyze } from '../index.js';

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
 * Run i18n->Excel conversion using resolved paths.
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

  const common = buildCommonOptions(options, defaultConfig, config, isDryRun);
  await convertToExcel(sourcePath, targetFile, common);

  if (isDryRun) logDryRunSingle();
  else logConversionCompleted(targetFile);
}

/**
 * Run Excel->i18n conversion using resolved paths.
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
 * Run Analysis.
 * @param {Object} options CLI options.
 * @param {Object} defaultConfig Default config.
 */
export async function runAnalyze(options, defaultConfig) {
  const sourcePath = options.input || defaultConfig.sourcePath;
  const codePattern = options.pattern || '**/*.{ts,html,js}';

  console.log(chalk.cyan(`Scanning for i18n keys in: ${codePattern}`));
  console.log(chalk.cyan(`Comparing with JSONs in: ${sourcePath}`));

  const report = await analyze({ sourcePath, codePattern });

  console.log(
    chalk.green(`\nFound ${report.totalCodeKeys} unique keys in code.`),
  );

  let hasIssues = false;
  for (const [file, result] of Object.entries(report.fileReports)) {
    if (result.missing.length > 0 || result.unused.length > 0) {
      console.log(chalk.yellow(`\n[${file}]`));
      if (result.missing.length > 0) {
        hasIssues = true;
        console.log(chalk.red('  Missing keys (in code but not in JSON):'));
        result.missing.forEach((k) => console.log(`    - ${k}`));
      }
      if (result.unused.length > 0) {
        hasIssues = true;
        console.log(chalk.gray('  Unused keys (in JSON but not in code):'));
        result.unused.forEach((k) => console.log(`    - ${k}`));
      }
    }
  }

  if (!hasIssues) {
    console.log(chalk.green('\nBuild successful! All keys are consistent.'));
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
    } else if (mergedOptions.analyze) {
      await runAnalyze(mergedOptions, defaultConfig);
    }
  } catch (error) {
    logError(error);
    process.exit(1); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
