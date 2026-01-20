/**
 * @fileoverview Console-based reporter implementation for translation reports.
 * Outputs translation issues and warnings to the console with formatted output.
 * @module reporters/console
 * @typedef {import('../types.js').Reporter} Reporter
 * @typedef {import('../types.js').TranslationReport} TranslationReport
 */

/**
 * Prints a labeled section with formatted items.
 *
 * @param {string} label - Section label to print.
 * @param {Array} items - Items to print.
 * @param {(item: unknown) => string} formatItem - Formatter function for each item.
 * @private
 */
const printSection = (label, items, formatItem) => {
  if (!items?.length) return;
  console.log(label);
  for (const item of items) {
    console.log(formatItem(item));
  }
};

/**
 * Console-based reporter that outputs translation reports to stdout.
 * Displays missing translations, duplicate keys, and placeholder inconsistencies
 * in a human-readable format.
 *
 * @type {Reporter}
 * @example
 * import { consoleReporter } from './reporters/console.js';
 * consoleReporter.print(report);
 */
export const consoleReporter = {
  /**
   * Prints a formatted summary of a translation report to the console.
   * Displays missing translations, duplicate keys, and placeholder inconsistencies.
   *
   * @param {TranslationReport} report - The translation report to print.
   */
  print: (report) => {
    const hasNoIssues =
      report.missing.length === 0 &&
      report.duplicates.length === 0 &&
      !report.placeholderInconsistencies?.length;

    if (hasNoIssues) {
      console.log(
        '✅ No missing, duplicate translations or placeholder issues found.',
      );
      return;
    }

    printSection(
      '⚠️ Missing translations:',
      report.missing,
      (entry) => `  - ${entry.key} (${entry.lang})`,
    );

    printSection(
      '⚠️ Duplicate keys:',
      report.duplicates,
      (key) => `  - ${key}`,
    );

    if (report.placeholderInconsistencies?.length) {
      console.log('⚠️ Inconsistent placeholders between languages:');
      for (const entry of report.placeholderInconsistencies) {
        console.log(`  - ${entry.key}:`);
        for (const [lang, placeholders] of Object.entries(entry.placeholders)) {
          console.log(`      [${lang}]: {${[...placeholders].join(', ')}}`);
        }
      }
    }
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
