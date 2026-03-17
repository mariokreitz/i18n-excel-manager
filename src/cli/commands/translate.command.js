/**
 * @module cli/commands/translate.command
 * Handler for the `translate` CLI command (AI-powered Excel translation).
 * Responsibilities: resolve API key → load provider → run translation.
 */

import chalk from 'chalk';

import { translate } from '../../index.js';
import {
  createBuiltInProvider,
  loadCustomProvider,
} from '../../providers/index.js';

import { createSpinner } from './shared/spinner.js';

/**
 * Resolve the Gemini API key from CLI options or environment variables.
 * @param {Object} options CLI options.
 * @returns {string} Resolved API key.
 * @throws {Error} If no API key is found in options or environment.
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
 * Run AI Translation.
 * @param {Object} options CLI options.
 * @returns {Promise<void>}
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

  // Warn when custom provider is loaded — executes arbitrary code.
  if (options.provider) {
    console.log(
      chalk.yellow(
        '⚠ Custom provider loaded. Ensure the provider path is trusted.\n' +
          '  See AGENTS.md §Security for details on the --provider trust model.',
      ),
    );
  }

  const languageMap =
    options.languageMap || (options.config && options.config.languages) || {};

  const provider = options.provider
    ? await loadCustomProvider(options.provider, apiKey, options.model)
    : createBuiltInProvider('gemini', apiKey, options.model);

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
      { provider },
    );
    spinner.succeed('Translation complete');
  } catch (error) {
    spinner.fail('Translation failed');
    throw error;
  }
}
