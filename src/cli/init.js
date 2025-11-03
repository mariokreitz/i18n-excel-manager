/**
 * Initialization-related functions for CLI.
 * @module cli/init
 */

import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import { MSG_DRY_RUN_PLURAL, MSG_INIT_COMPLETED_PREFIX } from './constants.js';
import {
  computeIsDryRun,
  parseLanguagesArg,
  writeInitFiles,
} from './helpers.js';

/**
 * Builds language choices for the init prompt with a safe fallback when no languages are configured.
 * @param {object} config - Configuration object that may contain a languages map.
 * @returns {{choices: Array<{name:string,value:string,checked:boolean}>, allLangs: string[]}} Choices and language list.
 */
export function buildLanguageChoices(config) {
  const provided = (config && config.languages) || {};
  const hasProvided = Object.keys(provided).length > 0;
  // Minimal safe fallback to avoid empty checkbox choices in interactive mode
  const fallback = { en: 'English', de: 'German' };
  const map = hasProvided ? provided : fallback;
  const allLangs = Object.keys(map);
  const defaults = new Set(['en', 'de'].filter((l) => allLangs.includes(l)));
  return {
    allLangs,
    choices: allLangs.map((code) => ({
      name: `${code} – ${map[code]}`,
      value: code,
      checked: defaults.has(code),
    })),
  };
}

/**
 * Prompts the user to select languages for initialization.
 * @param {object} config - Configuration object with languages.
 * @returns {Promise<string[]>} Array of selected language codes.
 */
export async function promptForLanguages(config) {
  const { choices } = buildLanguageChoices(config);
  const { langs } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'langs',
      message: 'Select languages to initialize:',
      choices,
      validate: (arr) =>
        arr.length > 0 ? true : 'Select at least one language',
    },
  ]);
  return langs;
}

/**
 * Runs the init command to initialize i18n files.
 * @param {object} options - Command options.
 * @param {string} [options.output] - Output directory.
 * @param {string} [options.languages] - Comma-separated languages.
 * @param {object} config - Configuration object.
 * @param {object} defaultConfig - Default configuration.
 * @returns {Promise<void>}
 */
export async function runInitCommand(options, config, defaultConfig) {
  try {
    const targetDir = options.output || defaultConfig.sourcePath;
    let languages = parseLanguagesArg(options.languages);
    if (!languages) {
      // Ask interactively if not provided
      languages = await promptForLanguages(config);
    }
    const dryRun = computeIsDryRun(options);
    console.log(
      chalk.blue(
        `Initializing i18n directory at ${path.resolve(targetDir)} for languages: ${languages.join(', ')}`,
      ),
    );
    const res = await writeInitFiles(targetDir, languages, dryRun);
    if (dryRun) {
      console.log(chalk.yellow(MSG_DRY_RUN_PLURAL));
    }
    console.log(chalk.green(`${MSG_INIT_COMPLETED_PREFIX}${res.dir}`));
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1); // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
  }
}
