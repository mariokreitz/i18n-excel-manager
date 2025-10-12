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
import inquirer from 'inquirer';

import { convertToExcel, convertToJson } from './src/index.js';
import { validateConfigObject } from './src/io/config.js';

const DESC_SHEET_NAME = 'name of the Excel worksheet';
const DESC_DRY_RUN = 'simulate only, do not write files';
const DESC_NO_REPORT = 'skip generating translation report';
const DESC_FAIL_ON_DUP =
  'fail if duplicate keys are detected in the Excel sheet';
const DESC_OUTPUT_I18N_DIR = 'target directory for i18n JSON files';

const MSG_CONVERTING_I18N_PREFIX = 'Converting i18n files from ';
const MSG_CONVERTING_EXCEL_PREFIX = 'Converting Excel from ';
const MSG_CONVERSION_COMPLETED_PREFIX = '✅ Conversion completed: ';
const MSG_DRY_RUN_SINGLE = '🔎 Dry-run: No file was written.';
const MSG_DRY_RUN_PLURAL = '🔎 Dry-run: No files were written.';

// Reused flag literals
const FLAG_DRY_RUN = '-d, --dry-run';
const FLAG_FAIL_ON_DUP = '--fail-on-duplicates';

const TOOL_NAME = 'i18n-excel-manager';
const TOOL_DESCRIPTION = 'Tool for converting i18n files to Excel and back';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load package information
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
);

// Load configuration and validate with Joi
const configPath = path.join(__dirname, 'config.json');
const RAW_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const CONFIG = validateConfigObject(RAW_CONFIG);

const defaultConfig = CONFIG.defaults || {
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
 * Shows the main interactive menu and processes the user's selection.
 * @async
 * @returns {Promise<void>}
 */
export async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose an action:',
      choices: [
        { name: 'Convert i18n files to Excel', value: 'toExcel' },
        { name: 'Convert Excel to i18n files', value: 'toJson' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'toExcel':
      await handleToExcel();
      break;
    case 'toJson':
      await handleToJson();
      break;
    case 'exit':
      console.log(chalk.green('Goodbye!'));
      process.exit(0);
      break;
  }
}

/**
 * Prompts the user for i18n-to-Excel conversion options and starts the process.
 * @async
 * @returns {Promise<void>}
 */
export async function handleToExcel() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Path to i18n files:',
      default: defaultConfig.sourcePath,
    },
    {
      type: 'input',
      name: 'targetFile',
      message: 'Target Excel file:',
      default: defaultConfig.targetFile,
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: defaultConfig.sheetName,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write file)?',
      default: false,
    },
  ]);

  if (
    typeof answers.sourcePath !== 'string' ||
    answers.sourcePath.trim() === ''
  ) {
    throw new Error('Source path must be a non-empty string');
  }
  if (
    typeof answers.targetFile !== 'string' ||
    answers.targetFile.trim() === ''
  ) {
    throw new Error('Target file must be a non-empty string');
  }
  if (
    typeof answers.sheetName !== 'string' ||
    answers.sheetName.trim() === ''
  ) {
    throw new Error('Sheet name must be a non-empty string');
  }

  await performConversion('toExcel', answers);
}

/**
 * Prompts the user for Excel-to-i18n conversion options and starts the process.
 * @async
 * @returns {Promise<void>}
 */
export async function handleToJson() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourceFile',
      message: 'Path to Excel file:',
      default: defaultConfig.targetFile,
    },
    {
      type: 'input',
      name: 'targetPath',
      message: 'Target folder for i18n files:',
      default: defaultConfig.targetPath,
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: defaultConfig.sheetName,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write files)?',
      default: false,
    },
  ]);

  // Validate user inputs
  if (
    typeof answers.sourceFile !== 'string' ||
    answers.sourceFile.trim() === ''
  ) {
    throw new Error('Source file must be a non-empty string');
  }
  if (
    typeof answers.targetPath !== 'string' ||
    answers.targetPath.trim() === ''
  ) {
    throw new Error('Target path must be a non-empty string');
  }
  if (
    typeof answers.sheetName !== 'string' ||
    answers.sheetName.trim() === ''
  ) {
    throw new Error('Sheet name must be a non-empty string');
  }

  await performConversion('toJson', answers);
}

/**
 * Performs the actual conversion based on the conversion type and user answers.
 * Handles both directions and prints results to the console.
 *
 * @async
 * @param {'toExcel'|'toJson'} conversionType - The conversion direction.
 * @param {object} answers - User answers from inquirer.
 * @returns {Promise<void>}
 */
export async function performConversion(conversionType, answers) {
  try {
    const options = {
      sheetName: answers.sheetName,
      dryRun: answers.dryRun,
      languageMap: CONFIG.languages,
    };

    if (conversionType === 'toExcel') {
      console.log(
        chalk.blue(
          `${MSG_CONVERTING_I18N_PREFIX}${answers.sourcePath} to ${answers.targetFile}...`,
        ),
      );
      await convertToExcel(answers.sourcePath, answers.targetFile, options);
    } else {
      console.log(
        chalk.blue(
          `${MSG_CONVERTING_EXCEL_PREFIX}${answers.sourceFile} to ${answers.targetPath}...`,
        ),
      );
      await convertToJson(answers.sourceFile, answers.targetPath, options);
    }

    if (answers.dryRun) {
      console.log(chalk.yellow(MSG_DRY_RUN_PLURAL));
    } else {
      const target =
        conversionType === 'toExcel' ? answers.targetFile : answers.targetPath;
      console.log(chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${target}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }

  await askForAnotherAction();
}

/**
 * Asks the user if they want to perform another action after a conversion.
 * @async
 * @returns {Promise<void>}
 */
export async function askForAnotherAction() {
  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: 'Do you want to perform another action?',
      default: true,
    },
  ]);

  if (again) {
    await showMainMenu();
  } else {
    console.log(chalk.green('Goodbye!'));
    process.exit(0);
  }
}

function computeIsDryRun(options) {
  return (
    options.dryRun === true ||
    process.argv.includes('-d') ||
    process.argv.includes('--dry-run')
  );
}

async function runI18nToExcel(options, isDryRun) {
  const sourcePath = options.input || defaultConfig.sourcePath;
  const targetFile = options.output || defaultConfig.targetFile;

  console.log(
    chalk.blue(`Converting i18n files from ${sourcePath} to ${targetFile}...`),
  );

  await convertToExcel(sourcePath, targetFile, {
    sheetName: options.sheetName || defaultConfig.sheetName,
    dryRun: isDryRun,
    languageMap: CONFIG.languages,
    report: options.report,
  });

  if (isDryRun) {
    console.log(chalk.yellow(MSG_DRY_RUN_SINGLE));
  } else {
    console.log(chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${targetFile}`));
  }
}

async function runExcelToI18n(options, isDryRun) {
  const sourceFile = options.input || defaultConfig.targetFile;
  const targetPath = options.output || defaultConfig.targetPath;

  console.log(
    chalk.blue(`Converting Excel from ${sourceFile} to ${targetPath}...`),
  );

  await convertToJson(sourceFile, targetPath, {
    sheetName: options.sheetName || defaultConfig.sheetName,
    dryRun: isDryRun,
    languageMap: CONFIG.languages,
    failOnDuplicates:
      options.failOnDuplicates === true ||
      process.argv.includes(FLAG_FAIL_ON_DUP),
  });

  if (isDryRun) {
    console.log(chalk.yellow(MSG_DRY_RUN_PLURAL));
  } else {
    console.log(chalk.green(`${MSG_CONVERSION_COMPLETED_PREFIX}${targetPath}`));
  }
}

/**
 * Processes CLI parameters for non-interactive mode.
 * Handles both i18n-to-excel and excel-to-i18n commands.
 * Loads and merges config file if specified, with CLI options taking precedence.
 *
 * @async
 * @param {object} options - Commander options object.
 * @param {boolean} [options.i18nToExcel] - If true, run i18n-to-excel mode.
 * @param {boolean} [options.excelToI18n] - If true, run excel-to-i18n mode.
 * @param {string} [options.input] - Input path (i18n directory or Excel file).
 * @param {string} [options.output] - Output path (Excel file or i18n directory).
 * @param {string} [options.sheetName] - Excel sheet name.
 * @param {boolean} [options.dryRun] - If true, simulate only, do not write files.
 * @param {boolean} [options.report] - If false, skip generating translation report.
 * @param {string} [options.config] - Path to config file.
 * @returns {Promise<void>} Resolves when processing is complete.
 */
export async function processCliOptions(options) {
  try {
    // Load config file if specified
    let configOptions = {};
    if (options.config) {
      try {
        const configRaw = fs.readFileSync(options.config, 'utf8');
        const configJson = JSON.parse(configRaw);
        configOptions = validateConfigObject(configJson);
      } catch (error) {
        throw new Error(
          `Failed to load config file '${options.config}': ${error.message}`,
        );
      }
    }

    // Merge config with CLI options, CLI takes precedence
    const mergedOptions = {
      ...configOptions.defaults,
      ...configOptions,
      ...options,
    };
    mergedOptions.languageMap = mergedOptions.languages || CONFIG.languages;

    const isDryRun = computeIsDryRun(mergedOptions);

    if (mergedOptions.i18nToExcel) {
      await runI18nToExcel(mergedOptions, isDryRun);
    } else if (mergedOptions.excelToI18n) {
      await runExcelToI18n(mergedOptions, isDryRun);
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
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
  .alias('to-excel')
  .description('Convert i18n JSON files to Excel')
  .option(
    '-i, --input <path>',
    'path to directory containing i18n JSON files',
    defaultConfig.sourcePath,
  )
  .option(
    '-o, --output <file>',
    'path for the output Excel file',
    defaultConfig.targetFile,
  )
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME, defaultConfig.sheetName)
  .option(FLAG_DRY_RUN, DESC_DRY_RUN)
  .option('--no-report', DESC_NO_REPORT)
  .option('--config <file>', 'path to config file', './config.json')
  .action((options) => {
    displayHeader();
    options.i18nToExcel = true;
    processCliOptions(options);
  });

// Command for Excel to i18n
program
  .command('excel-to-i18n')
  .alias('to-json')
  .description('Convert Excel file to i18n JSON files')
  .option('-i, --input <file>', 'path to Excel file', defaultConfig.targetFile)
  .option('-o, --output <path>', DESC_OUTPUT_I18N_DIR, defaultConfig.targetPath)
  .option('-s, --sheet-name <name>', DESC_SHEET_NAME, defaultConfig.sheetName)
  .option(FLAG_DRY_RUN, DESC_DRY_RUN)
  .option(FLAG_FAIL_ON_DUP, DESC_FAIL_ON_DUP)
  .option('--config <file>', 'path to config file', './config.json')
  .action((options) => {
    displayHeader();
    options.excelToI18n = true;
    processCliOptions(options);
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
    await showMainMenu();
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

// Only run main when this file is executed directly (not when imported)
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(chalk.red(`Error during execution: ${error.message}`));
    process.exit(1);
  });
}
