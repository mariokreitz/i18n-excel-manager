/**
 * CLI command handlers for non-interactive mode.
 * Responsibilities: orchestrate conversion calls and delegate config+logging to helpers.
 * @module cli/commands
 * Non-interactive command orchestrators for the CLI.
 * @typedef {import('../types.js').ConvertToExcelOptions} ConvertToExcelOptions
 * @typedef {import('../types.js').ConvertToJsonOptions} ConvertToJsonOptions
 */

import path from 'node:path';

import chalk from 'chalk';
import ora from 'ora';

import { analyze, convertToExcel, convertToJson, translate } from '../index.js';
import { buildSarifReport } from '../reporters/sarif.js';

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
 * Create a spinner instance. Disabled in CI or non-TTY environments.
 * @param {string} text Spinner text.
 * @returns {import('ora').Ora} Spinner instance.
 * @private
 */
function createSpinner(text) {
  const isSilent =
    process.env.CI === '1' ||
    process.env.CI === 'true' ||
    !process.stdout.isTTY;
  return ora({ text, isSilent });
}

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
 * Print or serialize the analysis report based on chosen format.
 * @param {Object} report Analysis report.
 * @param {Object} options CLI options.
 */
function printAnalysisOutput(report, options) {
  if (options.format === 'sarif') {
    const sarif = buildSarifReport(report, options.input);
    console.log(JSON.stringify(sarif, null, 2));
    return;
  }
  if (
    options.report === 'json' ||
    options.jsonReport ||
    options.format === 'json'
  ) {
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
 * Throw if CI gate flags are set and the report contains matching issues.
 * @param {Object} report Analysis report.
 * @param {Object} options CLI options.
 */
function enforceAnalysisGates(report, options) {
  const hasMissing = Object.values(report.fileReports).some(
    (r) => r.missing.length > 0,
  );
  const hasUnused = Object.values(report.fileReports).some(
    (r) => r.unused.length > 0,
  );
  if (options.failOnMissing && hasMissing) {
    throw new Error('Analysis failed: missing translation keys detected.');
  }
  if (options.failOnUnused && hasUnused) {
    throw new Error('Analysis failed: unused translation keys detected.');
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
    useCache: options.cache !== false,
  });

  printAnalysisOutput(report, options);
  enforceAnalysisGates(report, options);
}

/**
 * Run analysis in watch mode — re-runs on file changes.
 * @param {Object} options CLI options.
 * @returns {Promise<void>} Never resolves (keeps the process alive until Ctrl+C).
 */
export async function runAnalyzeWatch(options) {
  const { watch: chokidarWatch } = await import('chokidar');

  console.log(chalk.blue('Watch mode enabled. Press Ctrl+C to stop.\n'));
  await runAnalyze(options); // initial run

  const watchPaths = [
    options.input,
    options.pattern ?? 'src/**/*.{ts,js,html}',
  ];
  const watcher = chokidarWatch(watchPaths, { ignoreInitial: true });

  watcher.on('change', async (filePath) => {
    console.log(
      chalk.dim(`\nFile changed: ${filePath}. Re-running analysis...\n`),
    );
    try {
      await runAnalyze(options);
    } catch (error) {
      logError(error);
    }
  });

  // Keep the process alive
  await new Promise(() => {}); // resolved externally by Ctrl+C
}

/**
 * Resolve the Gemini API key from options or environment variables.
 * @param {Object} options CLI options.
 * @returns {string} Resolved API key.
 * @throws {Error} If no API key is found.
 */
function resolveApiKey(options) {
  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.I18N_MANAGER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key is missing. Pass --api-key or set GEMINI_API_KEY (fallback: I18N_MANAGER_API_KEY).',
    );
  }
  return apiKey;
}

/**
 * Dynamically load a custom translation provider module.
 * @param {string} providerPath Path to the provider module.
 * @param {string} apiKey API key to pass to the provider constructor.
 * @param {string} [model] Model name to pass to the provider constructor.
 * @returns {Promise<{provider: Object}>} Provider dependency object.
 */
async function loadCustomProvider(providerPath, apiKey, model) {
  const mod = await import(path.resolve(providerPath));
  const ProviderClass = mod.default;
  if (typeof ProviderClass !== 'function') {
    throw new TypeError(
      `Provider module must export a default class: ${providerPath}`,
    );
  }
  return { provider: new ProviderClass(apiKey, model) };
}

/**
 * Run AI Translation.
 * @param {Object} options CLI options.
 */
export async function runTranslate(options) {
  if (!options.input) {
    throw new Error('Please provide the Excel file path using --input');
  }

  const apiKey = resolveApiKey(options);

  console.log(chalk.blue('Use --source-lang to specify source (default: en).'));
  console.log(
    chalk.blue(
      'Use --model to specify Gemini model (default: gemini-2.5-flash).\n',
    ),
  );

  const languageMap =
    options.languageMap || (options.config && options.config.languages) || {};

  const providerDeps = options.provider
    ? await loadCustomProvider(options.provider, apiKey, options.model)
    : undefined;

  const spinner = createSpinner('Translating missing values...');
  spinner.start();
  try {
    await translate(
      {
        input: options.input,
        sourceLang: options.sourceLang || 'en',
        apiKey,
        model: options.model || 'gemini-2.5-flash',
        languageMap,
      },
      providerDeps,
    );
    spinner.succeed('Translation complete');
  } catch (error) {
    spinner.fail('Translation failed');
    throw error;
  }
}

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
