/**
 * @module cli/commands
 * Backward-compatibility shim.
 *
 * All command logic has been modularised into src/cli/commands/:
 *   - analyze.command.js
 *   - convert.command.js
 *   - translate.command.js
 *   - shared/spinner.js, shared/gates.js, shared/output.js
 *   - index.js  (dispatcher + processCliOptions)
 *
 * This file re-exports everything so existing imports keep working unchanged.
 */

export {
  processCliOptions,
  runAnalyze,
  runAnalyzeWatch,
  runExcelToI18n,
  runI18nToExcel,
  runTranslate,
} from './commands/index.js';
