/**
 * @fileoverview Lightweight validation helpers for input validation.
 * Provides reusable assertion functions with clear error messages.
 * @module core/validation
 */

/** @constant {RegExp} Pattern for alphanumeric characters only */
const IS_ALNUM = /^[\dA-Za-z]+$/;

/** @constant {RegExp} Pattern for splitting language codes on hyphens or underscores */
const SEGMENT_SPLIT = /[_-]/;

/**
 * Asserts that a value is a non-empty string.
 *
 * @param {unknown} value - Value to validate.
 * @param {string} [label='value'] - Label for error messages.
 * @returns {string} The validated string value.
 * @throws {TypeError} If value is not a non-empty string.
 * @example
 * assertNonEmptyString(input, 'username');
 */
export function assertNonEmptyString(value, label = 'value') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

/**
 * Asserts that a value is a valid file/directory path string.
 *
 * @param {unknown} p - Path value to validate.
 * @param {string} [label='path'] - Label for error messages.
 * @returns {string} The validated path string.
 * @throws {TypeError} If path is not a non-empty string.
 * @example
 * assertStringPath(filePath, 'configPath');
 */
export function assertStringPath(p, label = 'path') {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return p;
}

/**
 * Validates a language code format for security and correctness.
 *
 * Ensures the code consists of alphanumeric segments separated by hyphens or underscores,
 * with the first segment being 2-3 characters long (e.g., 'en', 'de-DE', 'zh_Hans').
 * This prevents path traversal attacks when language codes are used in file paths.
 *
 * Pure function — no filesystem dependency.
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
