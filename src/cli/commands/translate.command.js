/**
 * @module cli/commands/translate.command
 * Handler for the `translate` CLI command (AI-powered Excel translation).
 * Responsibilities: resolve API key → load provider → run translation.
 */

import path from 'node:path';

import chalk from 'chalk';

import { translate } from '../../index.js';

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
 * Dynamically load a custom translation provider module.
 *
 * SECURITY NOTE: This executes arbitrary code from the given path.
 * Only use with trusted, local provider files. Never point to untrusted sources.
 *
 * @param {string} providerPath Absolute or relative path to the provider module.
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
