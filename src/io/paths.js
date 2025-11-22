/**
 * @module io/paths
 * Path validation & safe joining utilities.
 * Handles language code validation and secure path construction.
 */

import path from 'node:path';

const IS_ALNUM = /^[\dA-Za-z]+$/;
const SEGMENT_SPLIT = /[_-]/;

/**
 * Validates a language code format.
 * Ensures the code consists of alphanumeric segments separated by hyphens or underscores,
 * with the first segment being 2-3 characters long.
 * @param {string} lang - The language code to validate.
 * @returns {string} The validated language code.
 * @throws {TypeError} If the language code is invalid.
 * Validate language code format (alphanumeric segments separated by '-' or '_').
 * @param {string} lang Language code candidate.
 * @returns {string} Same code on success.
 * @throws {TypeError} If invalid format.
 */
export function validateLanguageCode(lang) {
  if (typeof lang !== 'string') {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  const parts = lang.split(SEGMENT_SPLIT);
  if (parts.length === 0) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  // First segment length 2-3, alnum only
  if (parts[0].length < 2 || parts[0].length > 3 || !IS_ALNUM.test(parts[0])) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  // Subsequent segments must be non-empty and alnum
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].length === 0 || !IS_ALNUM.test(parts[i])) {
      throw new TypeError(`Invalid language code: ${lang}`);
    }
  }
  return lang;
}

/**
 * Safely joins a filename to a base directory, preventing directory traversal.
 * Ensures the resulting path is within the base directory.
 * @param {string} baseDir - The base directory path.
 * @param {string} filename - The filename to join.
 * @returns {string} The safe absolute path.
 * @throws {Error} If the resulting path would be outside the base directory.
 * Safely join filename within base directory; prevents directory traversal.
 * @param {string} baseDir Base directory.
 * @param {string} filename Relative filename.
 * @returns {string} Resolved safe absolute path.
 * @throws {Error} If resulting path escapes base.
 */
export function safeJoinWithin(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.resolve(resolvedBase, filename);
  const rel = path.relative(resolvedBase, candidate);
  if (rel === '' || rel === '.') return candidate; // exact base dir
  // If rel starts with '..' or is absolute, it's outside the base
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe output path: ${candidate}`);
  }
  return candidate;
}
