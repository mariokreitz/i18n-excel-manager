/**
 * @module cli/commands/shared/spinner
 * Centralized ora spinner factory with automatic CI/TTY suppression.
 */

import ora from 'ora';

/**
 * Create an ora spinner that is silenced in CI and non-TTY environments.
 * Centralises the environment check so all command handlers stay consistent.
 *
 * @param {string} text - Initial spinner text.
 * @param {import('../../runtime.js').Runtime} [runtime] Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} [options] Command options.
 * @returns {import('ora').Ora} Configured spinner instance (not yet started).
 */
export function createSpinner(text, runtime, options = {}) {
  const env = runtime?.env || process.env;
  const isSilent =
    options.quiet === true ||
    options.format === 'json' ||
    options.format === 'sarif' ||
    env.CI === '1' ||
    env.CI === 'true' ||
    runtime?.isTTY === false;
  return ora({ text, isSilent });
}
