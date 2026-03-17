/**
 * @module cli/configLoader
 * Load & validate CLI configuration JSON file.
 */

import fs from 'node:fs';
import path from 'node:path';

import { assertNonEmptyString } from '../core/validation.js';

function toCanonicalPath(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    const parentReal = fs.realpathSync(path.dirname(filePath));
    return path.join(parentReal, path.basename(filePath));
  }
}

function assertWithinCwd(filePath, label) {
  const cwdReal = fs.realpathSync(process.cwd());
  const targetReal = toCanonicalPath(filePath);
  const relativePath = path.relative(cwdReal, targetReal);
  if (
    relativePath !== '' &&
    relativePath !== '.' &&
    (relativePath.startsWith('..') || path.isAbsolute(relativePath))
  ) {
    throw new Error(
      `${label} must resolve within the current working directory`,
    );
  }
  return targetReal;
}

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

  const resolvedConfigPath = path.resolve(options.config);
  const canonicalConfigPath = assertWithinCwd(
    resolvedConfigPath,
    'Config file path',
  );

  const configRaw = fs.readFileSync(canonicalConfigPath, 'utf8');
  const configJson = JSON.parse(configRaw);
  return validateConfigObject ? validateConfigObject(configJson) : configJson;
}
