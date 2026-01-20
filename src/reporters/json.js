/**
 * @fileoverview JSON file-based reporter implementation for translation reports.
 * Writes translation reports to a JSON file for programmatic consumption.
 * @module reporters/json
 * @typedef {import('../types.js').Reporter} Reporter
 * @typedef {import('../types.js').TranslationReport} TranslationReport
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { assertStringPath } from '../core/validation.js';

/**
 * Creates a reporter that writes translation reports to a JSON file.
 *
 * The generated JSON file contains the full report structure including
 * missing translations, duplicates, and placeholder inconsistencies.
 *
 * @param {string} filePath - Path where the JSON report file will be written.
 * @returns {Reporter} Reporter object with print and warn methods.
 * @throws {TypeError} If filePath is not a valid string.
 * @example
 * const reporter = jsonFileReporter('./report.json');
 * await reporter.print(translationReport);
 */
export function jsonFileReporter(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  return {
    /**
     * Writes the translation report to a JSON file.
     *
     * @param {TranslationReport} report - The translation report to serialize.
     * @returns {Promise<void>} Resolves when the file is written.
     */
    print: async (report) => {
      const content = JSON.stringify(report, null, 2);
      await fs.writeFile(resolved, content, 'utf8');
    },
    /**
     * Outputs a warning message to console.warn.
     *
     * @param {string} m - The warning message to display.
     */
    warn: (m) => {
      console.warn(m);
    },
  };
}
