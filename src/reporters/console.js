export const consoleReporter = {
  print: (report) => {
    const hasNoIssues =
      report.missing.length === 0 &&
      report.duplicates.length === 0 &&
      (!report.placeholderInconsistencies ||
        report.placeholderInconsistencies.length === 0);

    if (hasNoIssues) {
      // eslint-disable-next-line no-console
      console.log(
        '✅ No missing, duplicate translations or placeholder issues found.',
      );
      return;
    }

    const printMissing = () => {
      if (report.missing.length === 0) return;
      // eslint-disable-next-line no-console
      console.log('⚠️ Missing translations:');
      for (const entry of report.missing) {
        // eslint-disable-next-line no-console
        console.log(`  - ${entry.key} (${entry.lang})`);
      }
    };

    const printDuplicates = () => {
      if (report.duplicates.length === 0) return;
      // eslint-disable-next-line no-console
      console.log('⚠️ Duplicate keys:');
      for (const key of report.duplicates) {
        // eslint-disable-next-line no-console
        console.log(`  - ${key}`);
      }
    };

    const printPlaceholderIssues = () => {
      if (!report.placeholderInconsistencies?.length) return;
      // eslint-disable-next-line no-console
      console.log('⚠️ Inconsistent placeholders between languages:');
      for (const entry of report.placeholderInconsistencies) {
        // eslint-disable-next-line no-console
        console.log(`  - ${entry.key}:`);
        for (const [lang, placeholders] of Object.entries(entry.placeholders)) {
          // eslint-disable-next-line no-console
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
  warn: (m) => {
    /* eslint-disable no-console */
    console.warn(m); /* eslint-enable no-console */
  },
};
