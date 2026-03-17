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
 */
function printFileAnalysis(file, res) {
  console.log(chalk.underline(`\n${file}`));
  if (res.missing.length > 0) {
    console.log(chalk.red('  Missing in JSON:'));
    for (const k of res.missing) console.log(`    - ${k}`);
  }
  if (res.unused.length > 0) {
    console.log(chalk.yellow('  Unused in Code:'));
    for (const k of res.unused) console.log(`    - ${k}`);
  }
  if (res.missing.length === 0 && res.unused.length === 0) {
    console.log(chalk.green('  All good!'));
  }
}

/**
 * Print or serialize the analysis report in the requested format.
 * Supports 'text' (default), 'json', and 'sarif'.
 *
 * @param {{totalCodeKeys: number, fileReports: Object}} report Analysis report.
 * @param {{format?: string, jsonReport?: boolean, report?: string, input?: string}} options CLI options.
 */
export function printAnalysisOutput(report, options) {
  if (options.format === 'sarif') {
    const sarif = buildSarifReport(report, options.input);
    console.log(JSON.stringify(sarif, null, 2));
    return;
  }
  if (
    options.report === 'json' ||
    options.jsonReport ||
    options.format === 'json'
  ) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(chalk.bold('\nAnalysis Report:'));
  console.log(`Total Code Keys Found: ${report.totalCodeKeys}`);
  for (const [file, res] of Object.entries(report.fileReports)) {
    printFileAnalysis(file, res);
  }
}
