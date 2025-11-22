/**
 * Utilities for loading and validating CLI configuration from a file.
 * @module cli/configLoader
 */

import fs from 'node:fs';
import path from 'node:path';

import { assertNonEmptyString } from '../core/validation.js';

/**
 * Loads configuration JSON from a file path specified via CLI options and validates it.
 *
 * Contract
 * - Input: options object that may include { config: string }, and a validate function.
 * - Output: a plain object containing validated config options (may include defaults, languages).
 * - Errors: throws Error with a clear message on path traversal, I/O, or validation/parse failures.
 *
 * @param {object} options - CLI options that may include a `config` path.
 * @param {(obj: object) => object} [validateConfigObject] - Optional validator/transformer for the loaded JSON.
 * @returns {object} The validated config object. Empty object when no config path provided.
 * @throws {Error} When the path is outside CWD, file read fails, or JSON is invalid.
 * @example
 * const cfg = loadConfigOptions({ config: './config.json' }, validate);
 */
export function loadConfigOptions(options, validateConfigObject) {
  if (!options || !options.config) return {};
  assertNonEmptyString(options.config, 'config');

  // Validate config file path to prevent directory traversal
  const resolvedConfigPath = path.resolve(options.config);
  const relativePath = path.relative(process.cwd(), resolvedConfigPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(
      'Config file path must be within the current working directory',
    );
  }

  const configRaw = fs.readFileSync(resolvedConfigPath, 'utf8');
  const configJson = JSON.parse(configRaw);
  return validateConfigObject ? validateConfigObject(configJson) : configJson;
}
