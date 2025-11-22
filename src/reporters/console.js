/**
 * @module reporters/console
 * Console-based reporter implementation.
 * @typedef {import('../types.js').Reporter} Reporter
 */

/**
 * Console-based reporter for translation reports.
 * Outputs translation issues and warnings to the console.
 */

/**
 * Reporter object that prints translation reports to the console.
 * @type {Reporter}
 * @property {Function} print - Prints a translation report summary.
 * @property {Function} warn - Prints a warning message.
 */
export const consoleReporter = {
  /**
   * Prints a summary of the translation report to the console.
   * Displays missing translations, duplicates, and placeholder inconsistencies.
   * @param {Object} report - The translation report object.
   * @param {Array<{key: string, lang: string}>} report.missing - Missing translations.
   * @param {string[]} report.duplicates - Duplicate keys.
   * @param {Array<{key: string, placeholders: Object.<string, Set<string>>}>} report.placeholderInconsistencies - Placeholder issues.
   */
  print: (report) => {
    const hasNoIssues =
      report.missing.length === 0 &&
      report.duplicates.length === 0 &&
      (!report.placeholderInconsistencies ||
        report.placeholderInconsistencies.length === 0);

    if (hasNoIssues) {
      console.log(
        '✅ No missing, duplicate translations or placeholder issues found.',
      );
      return;
    }
    const printMissing = () => {
      if (report.missing.length === 0) return;
      console.log('⚠️ Missing translations:');
      for (const entry of report.missing) {
        console.log(`  - ${entry.key} (${entry.lang})`);
      }
    };
    const printDuplicates = () => {
      if (report.duplicates.length === 0) return;
      console.log('⚠️ Duplicate keys:');
      for (const key of report.duplicates) {
        console.log(`  - ${key}`);
      }
    };
    const printPlaceholderIssues = () => {
      if (!report.placeholderInconsistencies?.length) return;
      console.log('⚠️ Inconsistent placeholders between languages:');
      for (const entry of report.placeholderInconsistencies) {
        console.log(`  - ${entry.key}:`);
        for (const [lang, placeholders] of Object.entries(entry.placeholders)) {
          console.log(
            `      [${lang}]: {${Array.from(placeholders).join(', ')}}`,
          );
        }
      }
    };
    printMissing();
    printDuplicates();
    printPlaceholderIssues();
  },
  /**
   * Prints a warning message to the console.
   * @param {string} m - The warning message.
   */
  warn: (m) => {
    console.warn(m);
  },
};
