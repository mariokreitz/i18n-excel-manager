/**
 * @module cli/commands/resolveAction
 * Resolve a single command action from merged CLI options.
 */

/**
 * Check whether a commander flag is explicitly enabled.
 * @param {unknown} value Flag value.
 * @returns {boolean} True only when value is strict boolean true.
 * @internal
 */
function hasFlag(value) {
  return value === true;
}

/**
 * Resolve action name from merged options.
 * @param {Object} options Merged command options.
 * @returns {'i18nToExcel'|'excelToI18n'|'init'|'analyze'|'analyzeThenTranslate'|'translate'|undefined}
 */
export function resolveAction(options) {
  const hasAnalyze = hasFlag(options.analyze);
  const hasTranslate = hasFlag(options.translate);

  if (hasFlag(options.i18nToExcel)) return 'i18nToExcel';
  if (hasFlag(options.excelToI18n)) return 'excelToI18n';
  if (hasFlag(options.init)) return 'init';
  if (hasAnalyze && hasTranslate) return 'analyzeThenTranslate';
  if (hasAnalyze) return 'analyze';
  if (hasTranslate) return 'translate';
}
