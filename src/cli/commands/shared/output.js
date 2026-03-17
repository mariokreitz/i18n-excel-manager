/**
 * @module cli/commands/shared/output
 * Analysis output formatting — human text, JSON, and SARIF.
 * Separated so output concerns never pollute command orchestration logic.
 */

import chalk from 'chalk';

import { buildSarifReport } from '../../../reporters/sarif.js';

/**
 * Format and print a single file's analysis result (human-readable).
 * @param {string} file Filename key.
 * @param {{missing: string[], unused: string[]}} res Analysis result for that file.
 * @param {{log: (...args: unknown[]) => void}} runtime Runtime-compatible logger.
 * @returns {void}
 */
function printFileAnalysis(file, res, runtime) {
  runtime.log(chalk.underline(`\n${file}`));
  if (res.missing.length > 0) {
    runtime.log(chalk.red('  Missing in JSON:'));
    for (const k of res.missing) runtime.log(`    - ${k}`);
  }
  if (res.unused.length > 0) {
    runtime.log(chalk.yellow('  Unused in Code:'));
    for (const k of res.unused) runtime.log(`    - ${k}`);
  }
  if (res.missing.length === 0 && res.unused.length === 0) {
    runtime.log(chalk.green('  All good!'));
  }
}

/**
 * Determine whether the selected output format is machine-readable.
 * @param {{format?: string}} options CLI options.
 * @returns {boolean} True for JSON and SARIF formats.
 * @internal
 */
function isMachineFormat(options) {
  return options.format === 'json' || options.format === 'sarif';
}

/**
 * Print or serialize the analysis report in the requested format.
 * Supports 'text' (default), 'json', and 'sarif'.
 *
 * @param {{totalCodeKeys: number, fileReports: Object}} report Analysis report.
 * @param {{format?: string, jsonReport?: boolean, report?: string, input?: string}} options CLI options.
 * @param {{log: (...args: unknown[]) => void}} [runtime=console] Runtime output sink.
 * @returns {void}
 */
export function printAnalysisOutput(report, options, runtime = console) {
  if (options.quiet && !isMachineFormat(options)) {
    return;
  }

  if (options.format === 'sarif') {
    const sarif = buildSarifReport(report, options.input);
    runtime.log(JSON.stringify(sarif, null, 2));
    return;
  }
  if (
    options.report === 'json' ||
    options.jsonReport ||
    options.format === 'json'
  ) {
    runtime.log(JSON.stringify(report, null, 2));
    return;
  }
  runtime.log(chalk.bold('\nAnalysis Report:'));
  runtime.log(`Total Code Keys Found: ${report.totalCodeKeys}`);
  for (const [file, res] of Object.entries(report.fileReports)) {
    printFileAnalysis(file, res, runtime);
  }
}
