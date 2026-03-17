/**
 * @module cli/commands/shared/gates
 * CI gate enforcement helpers for fail-on-* flags.
 */

/**
 * Throw if fail-on-missing or fail-on-unused flags are set and the report contains issues.
 * Extracted from commands.js so each command handler can apply gates independently.
 *
 * @param {{fileReports: Object<string, {missing: string[], unused: string[]}>}} report Analysis report.
 * @param {{failOnMissing?: boolean, failOnUnused?: boolean}} options CLI options.
 */
export function enforceAnalysisGates(report, options) {
  const hasMissing = Object.values(report.fileReports).some(
    (r) => r.missing.length > 0,
  );
  const hasUnused = Object.values(report.fileReports).some(
    (r) => r.unused.length > 0,
  );
  if (options.failOnMissing && hasMissing) {
    throw new Error('Analysis failed: missing translation keys detected.');
  }
  if (options.failOnUnused && hasUnused) {
    throw new Error('Analysis failed: unused translation keys detected.');
  }
}
