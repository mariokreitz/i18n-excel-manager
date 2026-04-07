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
 * Parse comma-separated metadata property names.
 * @param {unknown} metadataKeys Raw option value.
 * @returns {string[]|undefined} Normalized field names.
 * @internal
 */
function parseMetadataKeys(metadataKeys) {
  if (Array.isArray(metadataKeys)) {
    const clean = metadataKeys
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);
    return clean.length > 0 ? [...new Set(clean)] : undefined;
  }

  if (typeof metadataKeys !== 'string') {
    return;
  }

  const clean = metadataKeys
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  return clean.length > 0 ? [...new Set(clean)] : undefined;
}

/**
 * Parse comma-separated glob patterns for monorepo scanning.
 * @param {unknown} patterns Raw option value.
 * @returns {string[]|undefined} Normalized pattern list.
 * @internal
 */
function parsePatternList(patterns) {
  if (Array.isArray(patterns)) {
    const clean = patterns
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);
    return clean.length > 0 ? [...new Set(clean)] : undefined;
  }

  if (typeof patterns !== 'string') {
    return;
  }

  const clean = patterns
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  return clean.length > 0 ? [...new Set(clean)] : undefined;
}

/**
 * Resolve analyze code pattern input (single pattern or multi-pattern list).
 * @param {{pattern?: string, patterns?: string}} options CLI options.
 * @returns {string|string[]} Effective pattern input.
 * @internal
 */
function resolveCodePattern(options) {
  const list = parsePatternList(options.patterns);
  if (list && list.length > 0) {
    return list;
  }
  return options.pattern ?? '**/*.{ts,js,html}';
}

/**
 * Build informational logger for watch mode.
 * Routes to stderr for machine formats and suppresses output in quiet mode.
 *
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{quiet?: boolean, format?: string}} options CLI options.
 * @returns {(...args: unknown[]) => void} Informational logger.
 * @internal
 */
function watchInfoLogger(runtime, options) {
  if (options?.quiet === true) {
    return () => {};
  }
  if (options?.format === 'json' || options?.format === 'sarif') {
    return runtime.error;
  }
  return runtime.log;
}

/**
 * Run a single analysis pass.
 * @param {Object} options CLI options (must include `input`).
 * @param {import('../runtime.js').Runtime} [runtime=defaultRuntime()] Runtime abstraction.
 * @returns {Promise<void>}
 * @throws {Error} When input is missing or analysis gate fires.
 */
export async function runAnalyze(options, runtime = defaultRuntime()) {
  if (!options.input) {
    throw new Error('Please provide a source path using --input');
  }

  const report = await analyze({
    sourcePath: options.input,
    codePattern: resolveCodePattern(options),
    useCache: options.cache !== false,
    metadataKeyFields: parseMetadataKeys(options.metadataKeys),
  });

  printAnalysisOutput(report, options, runtime);
  enforceAnalysisGates(report, options);
}

/**
 * Run analysis in watch mode — re-runs on file changes.
 * @param {Object} options CLI options.
 * @param {import('../runtime.js').Runtime} [runtime=defaultRuntime()] Runtime abstraction.
 * @returns {Promise<void>} Never resolves (keeps the process alive until Ctrl+C).
 */
export async function runAnalyzeWatch(options, runtime = defaultRuntime()) {
  const { watch: chokidarWatch } = await import('chokidar');
  const effectiveCodePattern = resolveCodePattern(options);
  const info = watchInfoLogger(runtime, options);
  let isAnalyzing = false;
  let rerunRequested = false;

  info(chalk.blue('Watch mode enabled. Press Ctrl+C to stop.\n'));
  await runAnalyze(options, runtime); // initial run

  const watchPaths = [
    options.input,
    ...(Array.isArray(effectiveCodePattern)
      ? effectiveCodePattern
      : [effectiveCodePattern]),
  ];
  const watcher = chokidarWatch(watchPaths, { ignoreInitial: true });

  async function runWithCoalescing() {
    if (isAnalyzing) {
      rerunRequested = true;
      return;
    }

    isAnalyzing = true;
    do {
      rerunRequested = false;
      try {
        await runAnalyze(options, runtime);
      } catch (error) {
        logError(error, runtime);
      }
    } while (rerunRequested);
    isAnalyzing = false;
  }

  const onFileEvent = (eventName) => (filePath) => {
    info(
      chalk.dim(`\nFile ${eventName}: ${filePath}. Re-running analysis...\n`),
    );
    void runWithCoalescing();
  };

  watcher.on('change', onFileEvent('change'));
  watcher.on('add', onFileEvent('add'));
  watcher.on('unlink', onFileEvent('unlink'));

  watcher.on('error', (error) => {
    logError(error, runtime);
  });

  // Keep the process alive until Ctrl+C
  await new Promise(() => {});
}
