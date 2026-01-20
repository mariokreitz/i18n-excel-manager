/**
 * CLI command handlers for non-interactive mode.
 * Responsibilities: orchestrate conversion calls and delegate config+logging to helpers.
 * @module cli/commands
 * Non-interactive command orchestrators for the CLI.
 * @typedef {import('../types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('../types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

import chalk from 'chalk';

import { analyze, convertToExcel, convertToJson, translate } from '../index.js';

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
 * Format and print a file's analysis results.
 * @param {string} file Filename.
 * @param {{missing: string[], unused: string[]}} res Analysis result.
 */
function printFileAnalysis(file, res) {
  console.log(chalk.underline(`\n${file}`));
  if (res.missing.length > 0) {
    console.log(chalk.red('  Missing in JSON:'));
    for (const k of res.missing) console.log(`    - ${k}`);
  }
  if (res.unused.length > 0) {
    console.log(chalk.yellow('  Unused in Code:'));
    for (const k of res.unused) console.log(`    - ${k}`);
  }
  if (res.missing.length === 0 && res.unused.length === 0) {
    console.log(chalk.green('  All good!'));
  }
}

/**
 * Run Analysis.
 * @param {Object} options CLI options.
 */
export async function runAnalyze(options) {
  if (!options.input) {
    throw new Error('Please provide a source path using --input');
  }

  const report = await analyze({
    sourcePath: options.input,
    codePattern: options.pattern ?? '**/*.{ts,js,html}',
  });

  if (options.report === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(chalk.bold('\nAnalysis Report:'));
  console.log(`Total Code Keys Found: ${report.totalCodeKeys}`);

  for (const [file, res] of Object.entries(report.fileReports)) {
    printFileAnalysis(file, res);
  }
}

/**
 * Run AI Translation.
 * @param {Object} options CLI options.
 */
export async function runTranslate(options) {
  if (!options.input) {
    throw new Error('Please provide the Excel file path using --input');
  }

  // Check for API Key in flag or ENV
  const apiKey = options.apiKey || process.env.I18N_MANAGER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key is missing. Pass --api-key or set I18N_MANAGER_API_KEY.',
    );
  }

  console.log(chalk.blue('Use --source-lang to specify source (default: en).'));
  console.log(
    chalk.blue('Use --model to specify OpenAI model (default: gpt-4o-mini).\n'),
  );

  const languageMap =
    options.languageMap || (options.config && options.config.languages) || {};

  await translate({
    input: options.input,
    sourceLang: options.sourceLang || 'en',
    apiKey,
    model: options.model,
    languageMap,
  });
}

/**
 * Dispatch a command based on merged options.
 * @param {Object} mergedOptions Merged CLI options.
 * @param {Object} options Raw CLI options.
 * @param {boolean} isDryRun Dry-run flag.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} config Runtime validated config.
 * @returns {Promise<void>}
 */
async function dispatchCommand(
  mergedOptions,
  options,
  isDryRun,
  defaultConfig,
  config,
) {
  if (mergedOptions.i18nToExcel) {
    return runI18nToExcel(mergedOptions, isDryRun, defaultConfig, config);
  }
  if (mergedOptions.excelToI18n) {
    return runExcelToI18n(mergedOptions, isDryRun, defaultConfig, config);
  }
  if (mergedOptions.init) {
    return runInitCommand(mergedOptions, config, defaultConfig);
  }
  if (options.extract) {
    return runExcelToI18n(options);
  }
  if (options.analyze) {
    return runAnalyze(options);
  }
  if (options.translate) {
    return runTranslate({
      ...options,
      languageMap: config?.languages ?? {},
    });
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

    await dispatchCommand(
      mergedOptions,
      options,
      isDryRun,
      defaultConfig,
      config,
    );
  } catch (error) {
    logError(error);
    process.exit(1); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
