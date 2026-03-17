/**
 * @module cli/commands/analyze.command
 * Handler for the `analyze` CLI command and its `--watch` variant.
 * Responsibilities: prepare options → execute analyzeApp → format output → enforce CI gates.
 */

import chalk from 'chalk';

import { analyze } from '../../index.js';
import { logError } from '../logging.js';
import { defaultRuntime } from '../runtime.js';

import { enforceAnalysisGates } from './shared/gates.js';
import { printAnalysisOutput } from './shared/output.js';

/**
 * Run a single analysis pass.
 * @param {Object} options CLI options (must include `input`).
 * @returns {Promise<void>}
 * @throws {Error} When input is missing or analysis gate fires.
 */
export async function runAnalyze(options, runtime = defaultRuntime()) {
  if (!options.input) {
    throw new Error('Please provide a source path using --input');
  }

  const report = await analyze({
    sourcePath: options.input,
    codePattern: options.pattern ?? '**/*.{ts,js,html}',
    useCache: options.cache !== false,
  });

  printAnalysisOutput(report, options, runtime);
  enforceAnalysisGates(report, options);
}

/**
 * Run analysis in watch mode — re-runs on file changes.
 * @param {Object} options CLI options.
 * @returns {Promise<void>} Never resolves (keeps the process alive until Ctrl+C).
 */
export async function runAnalyzeWatch(options, runtime = defaultRuntime()) {
  const { watch: chokidarWatch } = await import('chokidar');

  runtime.log(chalk.blue('Watch mode enabled. Press Ctrl+C to stop.\n'));
  await runAnalyze(options, runtime); // initial run

  const watchPaths = [
    options.input,
    options.pattern ?? 'src/**/*.{ts,js,html}',
  ];
  const watcher = chokidarWatch(watchPaths, { ignoreInitial: true });

  watcher.on('change', async (filePath) => {
    runtime.log(
      chalk.dim(`\nFile changed: ${filePath}. Re-running analysis...\n`),
    );
    try {
      await runAnalyze(options, runtime);
    } catch (error) {
      logError(error, runtime);
    }
  });

  // Keep the process alive until Ctrl+C
  await new Promise(() => {});
}
