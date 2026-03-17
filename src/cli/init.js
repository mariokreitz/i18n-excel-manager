/**
 * @module cli/init
 * Interactive i18n directory initialization workflow.
 */

import fsp from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import inquirer from 'inquirer';

import { MSG_DRY_RUN_PLURAL, MSG_INIT_COMPLETED_PREFIX } from './constants.js';
import {
  computeIsDryRun,
  parseLanguagesArg,
  writeInitFiles,
} from './helpers.js';
import { logError } from './logging.js';
import { defaultRuntime } from './runtime.js';

/**
 * Builds language choices for the init prompt with a safe fallback when no languages are configured.
 * @param {object} config - Configuration object that may contain a languages map.
 * @returns {{choices:Array<{name:string,value:string,checked:boolean}>,allLangs:string[]}} Choices and language list.
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
export async function runInitCommand(
  options,
  config,
  defaultConfig,
  runtime = defaultRuntime(),
) {
  try {
    const infoLog = (() => {
      if (options?.quiet === true) return () => {};
      if (options?.format === 'json' || options?.format === 'sarif') {
        return runtime.error;
      }
      return runtime.log;
    })();

    const targetDir = options.output || defaultConfig?.sourcePath || '';
    let languages = parseLanguagesArg(options.languages);
    if (!languages) {
      // Ask interactively if not provided
      languages = await promptForLanguages(config);
    }
    const dryRun = computeIsDryRun(options, runtime.argv);

    // Load custom template if provided
    let templateData;
    if (options.template) {
      const raw = await fsp.readFile(path.resolve(options.template), 'utf8');
      templateData = JSON.parse(raw);
    }

    infoLog(
      chalk.blue(
        `Initializing i18n directory at ${path.resolve(targetDir)} for languages: ${languages.join(', ')}`,
      ),
    );
    const res = await writeInitFiles(
      targetDir,
      languages,
      dryRun,
      templateData,
      { ...runtime, log: infoLog },
    );
    if (dryRun) {
      infoLog(chalk.yellow(MSG_DRY_RUN_PLURAL));
    }
    infoLog(chalk.green(`${MSG_INIT_COMPLETED_PREFIX}${res.dir}`));
  } catch (error) {
    logError(error, runtime);
    runtime.exit(1);
  }
}
