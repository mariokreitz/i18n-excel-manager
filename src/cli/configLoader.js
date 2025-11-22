/**
 * @module cli/configLoader
 * Load & validate CLI configuration JSON file.
 */

import fs from 'node:fs';
import path from 'node:path';

import { assertNonEmptyString } from '../core/validation.js';

/**
 * Load configuration JSON from provided CLI options.
 * @param {Object} options CLI options (expects `config` path when used).
 * @param {(obj:Object)=>Object} [validateConfigObject] Optional validator/transformer.
 * @returns {Object} Validated config or empty object.
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
