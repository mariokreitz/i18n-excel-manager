/**
 * JSON file-based reporter for translation reports.
 * Outputs translation reports to a JSON file.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Asserts that the path is a non-empty string.
 * @param {*} p - The path to check.
 * @param {string} label - Label for error message.
 * @throws {TypeError} If path is not a non-empty string.
 */
function assertStringPath(p, label) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

/**
 * Creates a reporter that writes translation reports to a JSON file.
 * @param {string} filePath - Path where the JSON report file will be written.
 * @returns {Object} Reporter object with print and warn methods.
 * @returns {Function} result.print - Async function that writes the report to the file.
 * @returns {Function} result.warn - Function that prints a warning to console.
 * @throws {TypeError} If filePath is invalid.
 */
export function jsonFileReporter(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  return {
    /**
     * Writes the translation report to the JSON file.
     * @param {Object} report - The translation report object.
     * @returns {Promise<void>} Resolves when the file is written.
     */
    print: async (report) => {
      const content = JSON.stringify(report, null, 2);
      await fs.writeFile(resolved, content, 'utf8');
    },
    /**
     * Prints a warning message to the console.
     * @param {string} m - The warning message.
     */
    warn: (m) => {
      console.warn(m);
    },
  };
}
