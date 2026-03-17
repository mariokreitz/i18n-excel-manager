#!/usr/bin/env node

/**
 * CLI entry point for i18n-excel-manager
 * Provides an interactive menu for converting i18n files and Excel files
 *
 * @module cli
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { program } from 'commander';
import figlet from 'figlet';

import { processCliOptions } from './src/cli/commands/index.js';
import {
  DESC_ALL_SHEETS,
  DESC_CONFIG_FILE,
  DESC_DRY_RUN,
  DESC_FAIL_ON_DUP,
  DESC_FAIL_ON_MISSING,
  DESC_FAIL_ON_UNUSED,
  DESC_FORMAT,
  DESC_INIT_LANGS,
  DESC_INIT_TEMPLATE,
  DESC_JSON_REPORT,
  DESC_NO_REPORT,
  DESC_OUTPUT_I18N_DIR,
  DESC_PROVIDER,
  DESC_SHEET_NAME,
  DESC_WATCH,
  OPT_CONFIG_FLAG,
  TOOL_DESCRIPTION,
  TOOL_NAME,
} from './src/cli/constants.js';
import {
  isExecutedDirectly,
  tryLoadLocalConfig,
} from './src/cli/entryHelpers.js';
import { showMainMenu } from './src/cli/interactive.js';
import { validateConfigObject } from './src/io/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
);

/**
 * Validated local configuration loaded from CWD or packaged fallback.
 * `null` when no valid config file could be found.
 * @type {Object|null|undefined}
 */
const LOCAL_CONFIG = tryLoadLocalConfig(__dirname, validateConfigObject);

/**
 * Effective defaults used to populate CLI option defaults and the interactive menu.
 * Derived from `LOCAL_CONFIG.defaults` when available; otherwise hardcoded safe values.
 * @type {{sourcePath:string, targetFile:string, targetPath:string, sheetName:string}}
 */
const defaultConfig = (LOCAL_CONFIG && LOCAL_CONFIG.defaults) || {
  sourcePath: 'public/assets/i18n',
  targetFile: 'dist/translations.xlsx',
  targetPath: 'public/assets/i18n',
  sheetName: 'Translations',
};

/**
 * Displays the application header in the console using figlet and chalk.
 * Shows the tool name and version.
 * @returns {void}
 */
export function displayHeader() {
  console.log(
    chalk.cyan(
      figlet.textSync('i18n-excel-manager', { horizontalLayout: 'full' }),
    ),
  );
  console.log(chalk.white(`v${packageJson.version}`));
  console.log(chalk.white('Convert i18n files to Excel and back\n'));
}

/**
 * Decide whether the CLI banner should be printed for a command invocation.
 * Suppresses decorative output in machine-readable modes and quiet mode so
 * stdout remains parseable for automation.
 *
 * @param {{quiet?: boolean, jsonReport?: boolean, format?: string}} [options={}] Parsed command options.
 * @returns {boolean} True when the banner should be printed.
 */
function shouldDisplayHeaderForOptions(options = {}) {
  return !(
    options.quiet === true ||
    options.jsonReport === true ||
    options.format === 'json' ||
    options.format === 'sarif'
  );
}

/**
 * Configure and register all Commander subcommands.
 * Each command sets a flag on the parsed options object and delegates to
 * {@link processCliOptions} for normalization, validation and dispatch.
 */
program
  .name(TOOL_NAME)
  .version(packageJson.version)
  .description(TOOL_DESCRIPTION);

// Command for i18n to Excel
program
  .command('i18n-to-excel')
  .description('Convert i18n JSON files to Excel')
  .option('-i, --input <path>', 'path to directory containing i18n JSON files')
  .option('-o, --output <file>', 'path for the output Excel file')
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option('--format <type>', DESC_FORMAT)
  .option('--quiet', 'suppress non-error output')
  .option('--no-report', DESC_NO_REPORT)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    if (shouldDisplayHeaderForOptions(options)) displayHeader();
    options.i18nToExcel = true;
    processCliOptions(
      options,
      defaultConfig,
      LOCAL_CONFIG || {},
      validateConfigObject,
    );
  });

// Command for Excel to i18n
program
  .command('excel-to-i18n')
  .description('Convert Excel file to i18n JSON files')
  .option('-i, --input <file>', 'path to Excel file')
  .option('-o, --output <path>', DESC_OUTPUT_I18N_DIR)
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option('--format <type>', DESC_FORMAT)
  .option('--quiet', 'suppress non-error output')
  .option('--fail-on-duplicates', DESC_FAIL_ON_DUP)
  .option('--all-sheets', DESC_ALL_SHEETS)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    if (shouldDisplayHeaderForOptions(options)) displayHeader();
    options.excelToI18n = true;
    processCliOptions(
      options,
      defaultConfig,
      LOCAL_CONFIG || {},
      validateConfigObject,
    );
  });

// Command for initializing i18n directory and files
program
  .command('init')
  .description('Initialize i18n directory and create starter JSON files')
  .option('-o, --output <path>', DESC_OUTPUT_I18N_DIR)
  .option('-l, --languages <list>', DESC_INIT_LANGS)
  .option('-t, --template <file>', DESC_INIT_TEMPLATE)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option('--format <type>', DESC_FORMAT)
  .option('--quiet', 'suppress non-error output')
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    if (shouldDisplayHeaderForOptions(options)) displayHeader();
    options.init = true;
    processCliOptions(
      options,
      defaultConfig,
      LOCAL_CONFIG || {},
      validateConfigObject,
    );
  });

// Command for analyzing codebase
program
  .command('analyze')
  .description('Scan codebase for missing or unused translation keys')
  .option('-i, --input <path>', 'Path to directory containing i18n JSON files')
  .option(
    '-p, --pattern <glob>',
    'Glob pattern for source code files',
    '**/*.{html,ts,js}',
  )
  .option('--translate', 'Auto-translate missing values in Excel using Gemini')
  .option(
    '--api-key <key>',
    'Gemini API Key for translation (or set GEMINI_API_KEY, fallback I18N_MANAGER_API_KEY)',
  )
  .option('--source-lang <code>', 'Source language code for translation', 'en')
  .option('--model <model>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('--json-report', DESC_JSON_REPORT)
  .option('--fail-on-missing', DESC_FAIL_ON_MISSING)
  .option('--fail-on-unused', DESC_FAIL_ON_UNUSED)
  .option('--format <type>', DESC_FORMAT)
  .option('--quiet', 'suppress non-error output')
  .option('--watch', DESC_WATCH)
  .option('--no-cache', 'disable incremental analysis cache')
  .option('--provider <path>', DESC_PROVIDER)
  .option(
    '--excel-input <file>',
    'Excel file used when combining --translate with analyze',
  )
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    if (shouldDisplayHeaderForOptions(options)) displayHeader();
    options.analyze = true;
    processCliOptions(
      options,
      defaultConfig,
      LOCAL_CONFIG || {},
      validateConfigObject,
    );
  });

// Command for AI translation
program
  .command('translate')
  .description('Auto-translate missing values in Excel using Gemini')
  .option('-i, --input <file>', 'Path to Excel file')
  .option(
    '--api-key <key>',
    'Gemini API Key for translation (or set GEMINI_API_KEY, fallback I18N_MANAGER_API_KEY)',
  )
  .option('--source-lang <code>', 'Source language code for translation', 'en')
  .option('--model <model>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('--format <type>', DESC_FORMAT)
  .option('--quiet', 'suppress non-error output')
  .option('--provider <path>', DESC_PROVIDER)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    if (shouldDisplayHeaderForOptions(options)) displayHeader();
    options.translate = true;
    processCliOptions(
      options,
      defaultConfig,
      LOCAL_CONFIG || {},
      validateConfigObject,
    );
  });

/**
 * Main entry point for the application. Runs the interactive menu or parses CLI args.
 * @async
 * @returns {Promise<void>}
 */
async function main() {
  // If no arguments provided, show interactive menu
  if (process.argv.length <= 2) {
    displayHeader();
    // For interactive mode, use any local config if available for defaults and languages
    const cfg = LOCAL_CONFIG || {};
    await showMainMenu(cfg, defaultConfig);
  } else {
    program.parse(process.argv);
  }
}

// Error handling for unexpected errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`Unexpected error: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});

// Only run main when this file is executed directly (supports npm/yarn/pnpm bin symlinks)
const thisFile = fileURLToPath(import.meta.url);

if (isExecutedDirectly(thisFile)) {
  main().catch((error) => {
    console.error(chalk.red(`Error during execution: ${error.message}`));
    process.exit(1);
  });
}
