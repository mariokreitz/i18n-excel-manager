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
 * @returns {import('ora').Ora} Configured spinner instance (not yet started).
 */
export function createSpinner(text) {
  const isSilent =
    process.env.CI === '1' ||
    process.env.CI === 'true' ||
    !process.stdout.isTTY;
  return ora({ text, isSilent });
}
