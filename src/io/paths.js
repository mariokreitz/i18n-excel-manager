/**
 * @fileoverview Path validation and safe joining utilities.
 * Provides security functions for language code validation and directory traversal prevention.
 * @module io/paths
 */

import path from 'node:path';

/** @constant {RegExp} Pattern for alphanumeric characters only */
const IS_ALNUM = /^[\dA-Za-z]+$/;

/** @constant {RegExp} Pattern for splitting language codes on hyphens or underscores */
const SEGMENT_SPLIT = /[_-]/;

/**
 * Validates a language code format for security and correctness.
 *
 * Ensures the code consists of alphanumeric segments separated by hyphens or underscores,
 * with the first segment being 2-3 characters long (e.g., 'en', 'de-DE', 'zh_Hans').
 * This prevents path traversal attacks when language codes are used in file paths.
 *
 * @param {string} lang - The language code to validate.
 * @returns {string} The validated language code.
 * @throws {TypeError} If the language code is invalid or contains unsafe characters.
 * @example
 * validateLanguageCode('en');      // Returns: 'en'
 * validateLanguageCode('de-DE');   // Returns: 'de-DE'
 * validateLanguageCode('../etc');  // Throws: TypeError
 */
export function validateLanguageCode(lang) {
  if (typeof lang !== 'string') {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  const parts = lang.split(SEGMENT_SPLIT);
  if (parts.length === 0) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  if (parts[0].length < 2 || parts[0].length > 3 || !IS_ALNUM.test(parts[0])) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].length === 0 || !IS_ALNUM.test(parts[i])) {
      throw new TypeError(`Invalid language code: ${lang}`);
    }
  }
  return lang;
}

/**
 * Safely joins a filename to a base directory, preventing directory traversal attacks.
 *
 * Ensures the resulting path is within the base directory by checking that
 * the resolved path doesn't escape upward using '..' or absolute paths.
 *
 * @param {string} baseDir - The base directory path.
 * @param {string} filename - The filename to join.
 * @returns {string} The safe absolute path.
 * @throws {Error} If the resulting path would be outside the base directory.
 * @example
 * safeJoinWithin('./locales', 'en.json');     // Returns: '/abs/path/locales/en.json'
 * safeJoinWithin('./locales', '../etc/passwd'); // Throws: Error
 */
export function safeJoinWithin(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.resolve(resolvedBase, filename);
  const rel = path.relative(resolvedBase, candidate);
  if (rel === '' || rel === '.') return candidate;
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe output path: ${candidate}`);
  }
  return candidate;
}
