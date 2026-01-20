/**
 * @fileoverview Lightweight validation helpers for input validation.
 * Provides reusable assertion functions with clear error messages.
 * @module core/validation
 */

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
