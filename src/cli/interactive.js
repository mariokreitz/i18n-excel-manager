/**
 * @module cli/interactive
 * Interactive menu & prompt-driven conversion flows.
 */

import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  runAnalyze,
  runExcelToI18n,
  runI18nToExcel,
  runTranslate,
} from './commands.js';
import { MSG_INIT_DETECTED_NONE } from './constants.js';
import { detectI18nPresence } from './helpers.js';
import { runInitCommand } from './init.js';
import { logError } from './logging.js';

/**
 * Validator for required string input.
 * @param {string} input User input.
 * @returns {boolean|string} True if valid, or error message.
 */
const validateNonEmpty = (input) =>
  typeof input === 'string' && input.trim().length > 0
    ? true
    : 'Value cannot be empty.';

/**
 * Check if initialization is needed and run it if confirmed.
 * @returns {Promise<boolean>} True if init was run (caller should return).
 */
async function checkAndRunInit(config, defaultConfig) {
  const detection = await detectI18nPresence(defaultConfig.sourcePath);
  if (detection.exists && detection.jsonCount > 0) {
    return false;
  }

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
    return true;
  }
  return false;
}

/**
 * Display main interactive menu and dispatch chosen action.
 * @param {Object} config Runtime config.
 * @param {Object} defaultConfig Default config values.
 * @returns {Promise<void>}
 */
export async function showMainMenu(config, defaultConfig) {
  // Auto-detect and offer initialization if needed
  if (await checkAndRunInit(config, defaultConfig)) {
    return; // After init, return to menu on next run
  }
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: 'Choose an action:',
      choices: [
        { name: 'Convert i18n files to Excel', value: 'toExcel' },
        { name: 'Convert Excel to i18n files', value: 'toJson' },
        { name: 'Analyze Codebase (Missing/Unused)', value: 'analyze' },
        { name: 'AI Auto-Translate (Fill missing)', value: 'translate' },
        { name: 'Initialize i18n files', value: 'init' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  try {
    switch (action) {
      case 'toExcel': {
        await handleToExcel(defaultConfig, config);
        break;
      }
      case 'toJson': {
        await handleToJson(defaultConfig, config);
        break;
      }
      case 'analyze': {
        await handleAnalyze(defaultConfig);
        break;
      }
      case 'translate': {
        await handleTranslate(defaultConfig, config);
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
      }
    }
  } catch (error) {
    logError(error);
  }
}

/**
 * Prompt for Analysis parameters.
 */
export async function handleAnalyze(defaultConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: 'Path to i18n JSON files directory:',
      default: defaultConfig.sourcePath,
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'pattern',
      message: 'File pattern to scan (source code):',
      default: 'src/**/*.{ts,js,html}',
      validate: validateNonEmpty,
    },
  ]);

  try {
    await runAnalyze(answers);
  } catch (error) {
    logError(error);
  }
  await askForAnotherAction({}, defaultConfig);
}

/**
 * Prompt for AI Translation parameters.
 */
async function handleTranslate(defaultConfig, config) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: 'Path to Excel file:',
      default: defaultConfig.targetFile || 'translations.xlsx',
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'sourceLang',
      message: 'Source Language Code:',
      default: 'en',
      validate: validateNonEmpty,
    },
    {
      type: 'password',
      name: 'apiKey',
      message:
        'Gemini API Key (leave empty if GEMINI_API_KEY/I18N_MANAGER_API_KEY is set):',
      mask: '*',
    },
    {
      type: 'select',
      name: 'model',
      message: 'Gemini Model:',
      choices: [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-pro',
        'gemini-3-flash-preview',
        'gemini-3-pro-preview',
      ],
      default: 'gemini-2.5-flash',
    },
  ]);

  try {
    await runTranslate({
      input: answers.input,
      sourceLang: answers.sourceLang,
      apiKey: answers.apiKey || undefined,
      model: answers.model,
      languageMap: (config && config.languages) || {},
    });
  } catch (error) {
    logError(error);
  }
  await askForAnotherAction({}, defaultConfig);
}

/**
 * Prompt user for i18n->Excel parameters and invoke conversion.
 */
export async function handleToExcel(defaultConfig, config) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Path to i18n files:',
      default: defaultConfig.sourcePath,
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'targetFile',
      message: 'Target Excel file:',
      default: defaultConfig.targetFile,
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: defaultConfig.sheetName,
      validate: validateNonEmpty,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write file)?',
      default: false,
    },
  ]);

  try {
    // Adapt answers to options expected by runI18nToExcel
    // resolveI18nToExcelPaths checks options.sourcePath/targetFile too due to params.js mapping or standard check
    await runI18nToExcel(answers, answers.dryRun, defaultConfig, config);
  } catch (error) {
    logError(error);
  }
  await askForAnotherAction(config, defaultConfig);
}

/**
 * Prompt user for Excel->i18n parameters and invoke conversion.
 */
export async function handleToJson(defaultConfig, config) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourceFile',
      message: 'Path to Excel file:',
      default: defaultConfig.targetFile,
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'targetPath',
      message: 'Target folder for i18n files:',
      default: defaultConfig.targetPath,
      validate: validateNonEmpty,
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: defaultConfig.sheetName,
      validate: validateNonEmpty,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write files)?',
      default: false,
    },
  ]);

  try {
    // Adapt answers to options expected by runExcelToI18n
    // resolveExcelToI18nPaths expects 'input' or 'targetFile', but prompt uses 'sourceFile'
    await runExcelToI18n(
      { ...answers, input: answers.sourceFile },
      answers.dryRun,
      defaultConfig,
      config,
    );
  } catch (error) {
    logError(error);
  }
  await askForAnotherAction(config, defaultConfig);
}

/**
 * Ask user whether to perform another action after conversion.
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
