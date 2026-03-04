/**
 * @module cli/entryHelpers
 * Helpers extracted from cli.js for testability.
 * Provides config loading and execution-context detection for the CLI entry point.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Read and validate a config JSON file at an absolute path.
 * @param {string} absPath Absolute path to config file.
 * @param {(obj:Object)=>Object} validateConfigObject Validation transformer.
 * @returns {Object} Validated config object.
 * @throws {Error} If file read, JSON parse, or validation fails.
 */
export function loadAndValidateConfig(absPath, validateConfigObject) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = JSON.parse(raw);
  return validateConfigObject(parsed);
}

/**
 * Attempt to load a validated config from CWD or packaged fallback.
 * Returns undefined if no valid config can be loaded anywhere.
 *
 * Precedence: CWD config.json > packaged config.json > undefined
 *
 * @param {string} rootDir Root directory where the packaged config.json lives.
 * @param {(obj:Object)=>Object} validateConfigObject Validation transformer.
 * @param {string} [configRelPath='./config.json'] Relative path from CWD to config.
 * @returns {Object|undefined} Validated config or undefined.
 */
export function tryLoadLocalConfig(
  rootDir,
  validateConfigObject,
  configRelPath = './config.json',
) {
  // Contract: return validated config object, or undefined if none found/valid anywhere
  try {
    const absCwd = path.resolve(process.cwd(), configRelPath);
    if (fs.existsSync(absCwd)) {
      return loadAndValidateConfig(absCwd, validateConfigObject);
    }
  } catch {
    // ignore and continue to packaged fallback
  }

  // Fallback: packaged default config shipped with the tool
  try {
    const packaged = path.resolve(rootDir, 'config.json');
    if (fs.existsSync(packaged)) {
      return loadAndValidateConfig(packaged, validateConfigObject);
    }
  } catch {
    // ignore and surface as undefined below
  }

  // Swallow and treat as no config; actual loading with --config will surface errors
  // Intentionally return nothing (undefined) when no config could be loaded
}

/**
 * Determine whether the current process is executing this CLI file directly.
 * Supports npm/yarn/pnpm bin symlinks by resolving realpaths.
 *
 * @param {string} thisFile Absolute path of the CLI entry file (import.meta.url resolved).
 * @returns {boolean} True if the CLI file is being executed directly.
 */
export function isExecutedDirectly(thisFile) {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    // Resolve symlinks for robust comparison when invoked via npm bin shims
    const argvReal = fs.realpathSync(argv1);
    const selfReal = fs.realpathSync(thisFile);
    return argvReal === selfReal;
  } catch {
    // If realpath fails, fall back to a conservative comparison
    return path.resolve(process.argv[1] || '') === thisFile;
  }
}
