/**
 * Interactive menu functions for CLI.
 * @module cli/interactive
 */

import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import { convertToExcel, convertToJson } from '../index.js';

import {
  MSG_CONVERSION_COMPLETED_PREFIX,
  MSG_CONVERTING_EXCEL_PREFIX,
  MSG_CONVERTING_I18N_PREFIX,
  MSG_DRY_RUN_PLURAL,
  MSG_INIT_DETECTED_NONE,
} from './constants.js';
import { detectI18nPresence } from './helpers.js';
import { runInitCommand } from './init.js';

/**
 * Shows the main interactive menu and processes the user's selection.
 * @param {object} config - Configuration object.
 * @param {object} defaultConfig - Default configuration.
 * @returns {Promise<void>}
 */
export async function showMainMenu(config, defaultConfig) {
  // Auto-detect and offer initialization if needed
  const detection = await detectI18nPresence(defaultConfig.sourcePath);
  if (!detection.exists || detection.jsonCount === 0) {
    const full = path.resolve(defaultConfig.sourcePath);
    console.log(chalk.yellow(`${MSG_INIT_DETECTED_NONE}${full}`));
    const { doInit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'doInit',
        message: `Initialize i18n directory now at ${full}?`,
        default: true,
      },
    ]);
    if (doInit) {
      await runInitCommand(
        {
          output: defaultConfig.sourcePath,
          languages: 'en,de',
        },
        config,
        defaultConfig,
      );
      return; // After init, return to menu on next run
    }
  }
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: 'Choose an action:',
      choices: [
        { name: 'Convert i18n files to Excel', value: 'toExcel' },
        { name: 'Convert Excel to i18n files', value: 'toJson' },
        { name: 'Initialize i18n files', value: 'init' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'toExcel': {
      await handleToExcel(defaultConfig, config);
      break;
    }
    case 'toJson': {
      await handleToJson(defaultConfig, config);
      break;
    }
    case 'init': {
      await runInitCommand(
        { output: defaultConfig.sourcePath },
        config,
        defaultConfig,
      );
      break;
    }
    case 'exit': {
      console.log(chalk.green('Goodbye!'));
      process.exit(0); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
      break;
    }
  }
}

/**
 * Prompts the user for i18n-to-Excel conversion options and starts the process.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} config - Configuration object.
 * @returns {Promise<void>}
 */
export async function handleToExcel(defaultConfig, config) {
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

  await performConversion('toExcel', answers, defaultConfig, config);
}

/**
 * Prompts the user for Excel-to-i18n conversion options and starts the process.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} config - Configuration object.
 * @returns {Promise<void>}
 */
export async function handleToJson(defaultConfig, config) {
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

  await performConversion('toJson', answers, defaultConfig, config);
}

/**
 * Performs the actual conversion based on the conversion type and user answers.
 * Handles both directions and prints results to the console.
 * @param {'toExcel'|'toJson'} conversionType - The conversion direction.
 * @param {object} answers - User answers from inquirer.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} config - Configuration object.
 * @returns {Promise<void>}
 */
export async function performConversion(
  conversionType,
  answers,
  defaultConfig,
  config,
) {
  try {
    // Guard against undefined config in tests or direct calls
    const languageMap = (config && config.languages) || {};
    const options = {
      sheetName: answers.sheetName,
      dryRun: Boolean(answers.dryRun),
      languageMap,
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

  await askForAnotherAction(config, defaultConfig);
}

/**
 * Asks the user if they want to perform another action after a conversion.
 * @param {object} config - Configuration object.
 * @param {object} defaultConfig - Default configuration.
 * @returns {Promise<void>}
 */
export async function askForAnotherAction(config, defaultConfig) {
  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: 'Do you want to perform another action?',
      default: true,
    },
  ]);

  if (again) {
    await showMainMenu(config, defaultConfig);
  } else {
    console.log(chalk.green('Goodbye!'));
    process.exit(0); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
