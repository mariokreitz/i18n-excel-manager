// filepath: /Users/mariokreitz/dev/github/i18n-excel-manager/src/cli/params.js
/**
 * CLI parameter resolution helpers to keep command handlers simple.
 * @module cli/params
 */

/**
 * Resolve source and target paths for i18n->Excel conversion.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @returns {{sourcePath: string, targetFile: string}}
 */
export function resolveI18nToExcelPaths(options, defaultConfig) {
  const sourcePath =
    options.input || options.sourcePath || defaultConfig?.sourcePath || '';
  const targetFile =
    options.output || options.targetFile || defaultConfig?.targetFile || '';
  return { sourcePath, targetFile };
}

/**
 * Resolve source and target paths for Excel->i18n conversion.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @returns {{sourceFile: string, targetPath: string}}
 */
export function resolveExcelToI18nPaths(options, defaultConfig) {
  const sourceFile =
    options.input || options.targetFile || defaultConfig?.targetFile || '';
  const targetPath =
    options.output || options.targetPath || defaultConfig?.targetPath || '';
  return { sourceFile, targetPath };
}

/**
 * Build shared conversion options (sheetName, dryRun, languageMap) for both directions.
 * @param {object} options - CLI options.
 * @param {object} defaultConfig - Default configuration.
 * @param {object} runtimeConfig - Runtime validated config (may include languages).
 * @param {boolean} isDryRun - Dry run flag.
 * @returns {{sheetName: string, dryRun: boolean, languageMap?: object, report?: boolean}}
 */
export function buildCommonOptions(
  options,
  defaultConfig,
  runtimeConfig,
  isDryRun,
) {
  const sheetName =
    options.sheetName || defaultConfig?.sheetName || 'Translations';
  const languageMap = options.languageMap ?? runtimeConfig?.languages;
  const out = { sheetName, dryRun: isDryRun };
  if (languageMap) out.languageMap = languageMap;
  if ('report' in options) out.report = options.report;
  return out;
}

/**
 * Resolve fail-on-duplicates flag combining CLI option and argv flag.
 * @param {object} options - CLI options.
 * @param {string[]} argv - Process argv array.
 * @param {string} flagLiteral - The long flag literal to check in argv.
 * @returns {boolean}
 */
export function resolveFailOnDuplicates(options, argv, flagLiteral) {
  return (
    options.failOnDuplicates === true ||
    (Array.isArray(argv) && argv.includes(flagLiteral))
  );
}
