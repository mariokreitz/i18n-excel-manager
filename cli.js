#!/usr/bin/env node

/**
 * CLI entry point for i18n-excel-manager
 * Provides an interactive menu for converting i18n files and Excel files
 *
 * @module cli
 */

/* eslint-disable sonarjs/no-duplicate-string */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { program } from 'commander';
import figlet from 'figlet';

import { processCliOptions } from './src/cli/commands.js';
import {
  DEFAULT_CONFIG_FILE,
  DESC_CONFIG_FILE,
  DESC_DRY_RUN,
  DESC_FAIL_ON_DUP,
  DESC_INIT_LANGS,
  DESC_NO_REPORT,
  DESC_OUTPUT_I18N_DIR,
  DESC_SHEET_NAME,
  OPT_CONFIG_FLAG,
  TOOL_DESCRIPTION,
  TOOL_NAME,
} from './src/cli/constants.js';
import { showMainMenu } from './src/cli/interactive.js';
import { validateConfigObject } from './src/io/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load package information
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
);

// Helper: try loading a config file from CWD; return undefined if missing/invalid
function tryLoadLocalConfig(configRelPath = DEFAULT_CONFIG_FILE) {
  try {
    const abs = path.resolve(process.cwd(), configRelPath);
    if (!fs.existsSync(abs)) return undefined;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = fs.readFileSync(abs, 'utf8');
    const parsed = JSON.parse(raw);
    return validateConfigObject(parsed);
  } catch {
    // Swallow and treat as no config; actual loading with --config will surface errors
    return undefined;
  }
}

// Establish runtime defaults for CLI declarations (used only for UI prompts)
// Prefer local config if present; otherwise fall back to conservative built-ins
const LOCAL_CONFIG = tryLoadLocalConfig();
const defaultConfig = (LOCAL_CONFIG && LOCAL_CONFIG.defaults) || {
  sourcePath: 'public/assets/i18n',
  targetFile: 'dist/translations.xlsx',
  targetPath: 'locales',
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
 * Configure command line arguments
 */
program
  .name(TOOL_NAME)
  .version(packageJson.version)
  .description(TOOL_DESCRIPTION);

// Command for i18n to Excel
program
  .command('i18n-to-excel')
  .description('Convert i18n JSON files to Excel')
  .option(
    '-i, --input <path>',
    'path to directory containing i18n JSON files',
  )
  .option(
    '-o, --output <file>',
    'path for the output Excel file',
  )
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option('--no-report', DESC_NO_REPORT)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    displayHeader();
    options.i18nToExcel = true;
    processCliOptions(options, defaultConfig, LOCAL_CONFIG || {}, validateConfigObject);
  });

// Command for Excel to i18n
program
  .command('excel-to-i18n')
  .description('Convert Excel file to i18n JSON files')
  .option('-i, --input <file>', 'path to Excel file')
  .option('-o, --output <path>', DESC_OUTPUT_I18N_DIR)
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option('--fail-on-duplicates', DESC_FAIL_ON_DUP)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    displayHeader();
    options.excelToI18n = true;
    processCliOptions(options, defaultConfig, LOCAL_CONFIG || {}, validateConfigObject);
  });

// Command for initializing i18n directory and files
program
  .command('init')
  .description('Initialize i18n directory and create starter JSON files')
  .option('-o, --output <path>', DESC_OUTPUT_I18N_DIR)
  .option('-l, --languages <list>', DESC_INIT_LANGS)
  .option('-d, --dry-run', DESC_DRY_RUN)
  .option(OPT_CONFIG_FLAG, DESC_CONFIG_FILE)
  .action((options) => {
    displayHeader();
    options.init = true;
    processCliOptions(options, defaultConfig, LOCAL_CONFIG || {}, validateConfigObject);
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

function isExecutedDirectly() {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    // Resolve symlinks for robust comparison when invoked via npm bin shims
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const argvReal = fs.realpathSync(argv1);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const selfReal = fs.realpathSync(thisFile);
    return argvReal === selfReal;
  } catch {
    // If realpath fails, fall back to a conservative comparison
    return path.resolve(process.argv[1] || '') === thisFile;
  }
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(chalk.red(`Error during execution: ${error.message}`));
    process.exit(1);
  });
}

/* eslint-enable sonarjs/no-duplicate-string */
