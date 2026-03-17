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
import { defaultRuntime } from '../runtime.js';

import { createSpinner } from './shared/spinner.js';

/**
 * Resolve the Gemini API key from CLI options or environment variables.
 * @param {Object} options CLI options.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction with env overrides.
 * @returns {string} Resolved API key.
 * @throws {Error} If no API key is found in options or environment.
 */
function resolveApiKey(options, runtime) {
  const env = runtime?.env || {};
  const apiKey =
    options.apiKey || env.GEMINI_API_KEY || env.I18N_MANAGER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key is missing. Pass --api-key or set GEMINI_API_KEY (fallback: I18N_MANAGER_API_KEY).',
    );
  }
  return apiKey;
}

/**
 * Build info logger sink for translate command output.
 * Routes informational logs to stderr for machine formats to keep stdout parsable.
 *
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} options CLI options.
 * @returns {(...args: unknown[]) => void} Logging function for informational output.
 * @internal
 */
function infoLogger(runtime, options) {
  if (options?.quiet) {
    return () => {};
  }
  if (options?.format === 'json' || options?.format === 'sarif') {
    return runtime.error;
  }
  return runtime.log;
}

/**
 * Create logger dependency passed into translation application layer.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} options CLI options.
 * @returns {{log: (...args: unknown[]) => void}} Minimal logger contract.
 * @internal
 */
function createTranslateLogger(runtime, options) {
  const log = infoLogger(runtime, options);
  return { log };
}

/**
 * Run AI Translation.
 * @param {Object} options CLI options.
 * @param {import('../runtime.js').Runtime} [runtime=defaultRuntime()] Runtime abstraction.
 * @returns {Promise<void>}
 */
export async function runTranslate(options, runtime = defaultRuntime()) {
  if (!options.input) {
    throw new Error('Please provide the Excel file path using --input');
  }

  const apiKey = resolveApiKey(options, runtime);

  const info = infoLogger(runtime, options);

  info(chalk.blue('Use --source-lang to specify source (default: en).'));
  info(
    chalk.blue(
      'Use --model to specify Gemini model (default: gemini-2.5-flash).\n',
    ),
  );

  // Warn when custom provider is loaded — executes arbitrary code.
  if (options.provider) {
    runtime.warn(
      chalk.yellow(
        '⚠ Custom provider loaded. Ensure the provider path is trusted.\n' +
          '  See README: "AI Auto-Translation" for --provider trust guidance.',
      ),
    );
  }

  const { languageMap = {} } = options;

  const provider = options.provider
    ? await loadCustomProvider(options.provider, apiKey, options.model)
    : createBuiltInProvider('gemini', apiKey, options.model);

  const spinner = createSpinner(
    'Translating missing values...',
    runtime,
    options,
  );
  spinner.start();
  try {
    await translate(
      {
        input: options.input,
        sourceLang: options.sourceLang,
        apiKey,
        model: options.model,
        languageMap,
      },
      { provider, logger: createTranslateLogger(runtime, options) },
    );
    spinner.succeed('Translation complete');
  } catch (error) {
    spinner.fail('Translation failed');
    throw error;
  }
}
