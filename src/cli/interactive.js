/**
 * @module cli/interactive
 * Interactive menu & prompt-driven conversion flows.
 *
 * NOTE: Error handling in interactive mode is intentionally different from
 * CLI mode. In CLI mode, errors in processCliOptions call process.exit(1).
 * In interactive mode, errors are caught, logged via logError, and the user is
 * returned to the menu to try again. This is the expected UX for an interactive tool.
 */

import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  runAnalyze,
  runExcelToI18n,
  runI18nToExcel,
  runTranslate,
} from './commands/index.js';
import { buildCommonOptions } from './configResolution.js';
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
 * @param {Object} config Runtime config.
 * @param {Object} defaultConfig Default config values.
 * @returns {Promise<boolean>} True if init was run (caller should continue loop).
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
 * Dispatch the chosen menu action to the appropriate handler.
 * @param {string} action Selected menu action.
 * @param {Object} config Runtime config.
 * @param {Object} defaultConfig Default config values.
 * @returns {Promise<void>}
 */
async function dispatchMenuAction(action, config, defaultConfig) {
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
  }
}

/**
 * Display main interactive menu and dispatch chosen action.
 * Uses an iterative while loop to avoid unbounded call-stack growth.
 * @param {Object} config Runtime config.
 * @param {Object} defaultConfig Default config values.
 * @returns {Promise<void>}
 */
export async function showMainMenu(config, defaultConfig) {
  while (true) {
    // Auto-detect and offer initialization if needed
    if (await checkAndRunInit(config, defaultConfig)) {
      continue;
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

    if (action === 'exit') {
      console.log(chalk.green('Goodbye!'));
      process.exit(0); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
    }

    try {
      await dispatchMenuAction(action, config, defaultConfig);
    } catch (error) {
      // Interactive mode: log the error and ask the user if they want to continue.
      // This is intentionally different from CLI mode, which calls process.exit(1).
      logError(error);
    }

    const shouldContinue = await askForAnotherAction();
    if (!shouldContinue) {
      console.log(chalk.green('Goodbye!'));
      process.exit(0); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
    }
    // loop continues — no recursion
  }
}

/**
 * Prompt for Analysis parameters.
 * @param {Object} defaultConfig Default config values.
 * @returns {Promise<void>}
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

  await runAnalyze(answers);
}

/**
 * Prompt for AI Translation parameters.
 * @param {Object} defaultConfig Default config values.
 * @param {Object} config Runtime config.
 * @returns {Promise<void>}
 * @private
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

  await runTranslate({
    input: answers.input,
    sourceLang: answers.sourceLang,
    apiKey: answers.apiKey || undefined,
    model: answers.model,
    languageMap: (config && config.languages) || {},
  });
}

/**
 * Prompt user for i18n->Excel parameters and invoke conversion.
 * @param {Object} defaultConfig Default config values.
 * @param {Object} config Runtime config.
 * @returns {Promise<void>}
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

  await runI18nToExcel({
    ...answers,
    format: 'text',
    quiet: false,
    common: buildCommonOptions(answers, defaultConfig, config, answers.dryRun),
  });
}

/**
 * Prompt user for Excel->i18n parameters and invoke conversion.
 * @param {Object} defaultConfig Default config values.
 * @param {Object} config Runtime config.
 * @returns {Promise<void>}
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

  await runExcelToI18n({
    ...answers,
    failOnDuplicates: false,
    format: 'text',
    quiet: false,
    common: buildCommonOptions(answers, defaultConfig, config, answers.dryRun),
  });
}

/**
 * Ask user whether to perform another action after conversion.
 * Returns true if the user wants to continue, false otherwise.
 * NOTE: This function no longer recurses into showMainMenu.
 * @returns {Promise<boolean>} True if user wants to continue.
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

  return again;
}
