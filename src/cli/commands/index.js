/**
 * @module cli/commands/index
 * Central dispatcher for all CLI commands.
 * Re-exports command runners and provides processCliOptions + dispatchCommand.
 *
 * This module is the canonical command-dispatch entrypoint for CLI execution.
 */

import { loadConfigOptions } from '../configLoader.js';
import { mergeCliOptions } from '../configResolution.js';
import {
  assertCommandInvariants,
  normalizeCommandOptions,
} from '../contracts/index.js';
import { computeIsDryRun } from '../helpers.js';
import { runInitCommand } from '../init.js';
import { logError } from '../logging.js';
import { defaultRuntime } from '../runtime.js';

import { runAnalyze, runAnalyzeWatch } from './analyze.command.js';
import { runExcelToI18n, runI18nToExcel } from './convert.command.js';
import { resolveAction } from './resolveAction.js';
import { runTranslate } from './translate.command.js';

export { runAnalyze, runAnalyzeWatch } from './analyze.command.js';
export { runExcelToI18n, runI18nToExcel } from './convert.command.js';
export { runTranslate } from './translate.command.js';

/**
 * Execute the composed analyze -> translate pipeline.
 *
 * This helper preserves backward compatibility for legacy invocations that pass
 * an `.xlsx` path via `analyze --translate --input ...` by short-circuiting
 * directly to translation.
 *
 * @param {Object} mergedOptions Normalized merged options.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @returns {Promise<void>} Resolves when composed execution completes.
 */
async function runAnalyzeThenTranslate(mergedOptions, runtime) {
  const inputValue = String(mergedOptions.input || '');
  if (/\.xlsx$/i.test(inputValue)) {
    // Backward-compat bridge for legacy analyze --translate with Excel input.
    return runTranslate({ ...mergedOptions, input: inputValue }, runtime);
  }

  await runAnalyze(mergedOptions, runtime);
  return runTranslate(
    { ...mergedOptions, input: mergedOptions.excelInput },
    runtime,
  );
}

/**
 * Resolve an action handler function for the selected command.
 *
 * Handlers are created lazily so command execution remains centralized while
 * keeping dispatcher branching shallow and testable.
 *
 * @param {'i18nToExcel'|'excelToI18n'|'init'|'analyze'|'analyzeThenTranslate'|'translate'|undefined} action Resolved action.
 * @param {Object} mergedOptions Normalized merged options.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{config?: Object, defaultConfig?: Object}} context Dispatch context.
 * @returns {(() => Promise<void>)|undefined} Action handler or undefined when action is unknown.
 */
function getActionHandler(action, mergedOptions, runtime, context) {
  const { config, defaultConfig } = context;

  const handlers = {
    i18nToExcel: () => runI18nToExcel(mergedOptions, runtime),
    excelToI18n: () => runExcelToI18n(mergedOptions, runtime),
    init: () => runInitCommand(mergedOptions, config, defaultConfig, runtime),
    analyze: () =>
      mergedOptions.watch
        ? runAnalyzeWatch(mergedOptions, runtime)
        : runAnalyze(mergedOptions, runtime),
    analyzeThenTranslate: () => runAnalyzeThenTranslate(mergedOptions, runtime),
    translate: () => runTranslate(mergedOptions, runtime),
  };

  return handlers[action];
}

/**
 * Dispatch a command based on merged options.
 * @param {'i18nToExcel'|'excelToI18n'|'init'|'analyze'|'analyzeThenTranslate'|'translate'|undefined} action Resolved command action.
 * @param {Object} mergedOptions Normalized CLI options.
 * @param {import('../runtime.js').Runtime} runtime Runtime abstraction.
 * @param {{config?: Object, defaultConfig?: Object}} [context] Dispatch context.
 * @returns {Promise<void>}
 */
async function dispatchCommand(action, mergedOptions, runtime, context = {}) {
  const handler = getActionHandler(action, mergedOptions, runtime, context);
  if (handler) {
    return handler();
  }

  throw new Error('No command selected. Use --help to see available commands.');
}

/**
 * Process CLI options and dispatch chosen command.
 * @param {Object} options Raw commander options.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} config Runtime validated config.
 * @param {(obj:Object)=>Object} validateConfigObject Validation transformer.
 * @param {import('../runtime.js').Runtime} [runtime] Injectable runtime — defaults to real process.
 * @returns {Promise<void>} Resolves when processing is complete; exits on error.
 */
export async function processCliOptions(
  options,
  defaultConfig,
  config,
  validateConfigObject,
  runtime = defaultRuntime(),
) {
  try {
    const configOptions = loadConfigOptions(options, validateConfigObject);
    const mergedOptions = mergeCliOptions(
      options ?? {},
      configOptions,
      defaultConfig,
      config,
    );
    const isDryRun = computeIsDryRun(mergedOptions, runtime.argv);
    const action = resolveAction(mergedOptions);
    const normalizedOptions = normalizeCommandOptions(action, mergedOptions, {
      defaultConfig,
      runtime,
      runtimeConfig: config,
      isDryRun,
    });
    assertCommandInvariants(action, normalizedOptions, { runtime });

    await dispatchCommand(action, normalizedOptions, runtime, {
      config,
      defaultConfig,
    });
  } catch (error) {
    logError(error, runtime);
    runtime.exit(1);
  }
}
