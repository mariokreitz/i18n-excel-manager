/**
 * @module cli/configResolution
 * Centralized resolution helpers for paths, options, and flags.
 */

/**
 * Resolve baseline defaults used for option merging.
 * CLI flow precedence is applied later; this helper only selects the base layer.
 *
 * @param {Object} [configOptions] Loaded config options.
 * @param {Object} [defaultConfig] Entry-point defaults.
 * @returns {Object} Base defaults object.
 * @internal
 */
function getBaseDefaults(configOptions, defaultConfig) {
  return configOptions?.defaults || defaultConfig || {};
}

/**
 * Normalize incoming CLI options to an object.
 * @param {Object} [cliOptions] Raw commander options.
 * @returns {Object} Safe options object.
 * @internal
 */
function getIncoming(cliOptions) {
  return cliOptions || {};
}

/**
 * Resolve effective language map with documented precedence.
 * Order: CLI option -> config.languages -> runtimeConfig.languages.
 *
 * @param {Object} opts Normalized CLI options.
 * @param {Object} [configOptions] Loaded config options.
 * @param {Object} [runtimeConfig] Runtime validated config.
 * @returns {Object<string, string>|undefined} Language code -> label map.
 * @internal
 */
function resolveLanguageMap(opts, configOptions, runtimeConfig) {
  return (
    opts.languageMap ?? configOptions?.languages ?? runtimeConfig?.languages
  );
}

/**
 * Ensure conversion sheet name always has a deterministic fallback.
 * @param {string|undefined} current Candidate sheet name.
 * @param {Object} baseDefaults Base defaults object.
 * @returns {string} Effective sheet name.
 * @internal
 */
function ensureSheetName(current, baseDefaults) {
  return current || baseDefaults.sheetName || 'Translations';
}

/**
 * Merge CLI options with config defaults applying precedence.
 * @param {Object} cliOptions Raw CLI options.
 * @param {Object} configOptions Loaded config file options.
 * @param {Object} defaultConfig Entry defaults.
 * @param {Object} runtimeConfig Runtime validated config.
 * @returns {Object} Merged options object.
 */
export function mergeCliOptions(
  cliOptions,
  configOptions,
  defaultConfig,
  runtimeConfig,
) {
  const baseDefaults = getBaseDefaults(configOptions, defaultConfig);
  const opts = getIncoming(cliOptions);
  const merged = { ...baseDefaults, ...opts };
  const lm = resolveLanguageMap(opts, configOptions, runtimeConfig);
  if (lm) merged.languageMap = lm;
  merged.sheetName = ensureSheetName(merged.sheetName, baseDefaults);
  return merged;
}

/**
 * Resolve source/target for i18n->Excel conversion.
 * @param {Object} options Options object.
 * @param {Object} defaultConfig Entry defaults.
 * @returns {{sourcePath:string,targetFile:string}}
 */
export function resolveI18nToExcelPaths(options, defaultConfig) {
  const sourcePath =
    options.input || options.sourcePath || defaultConfig?.sourcePath || '';
  const targetFile =
    options.output || options.targetFile || defaultConfig?.targetFile || '';
  return { sourcePath, targetFile };
}

/**
 * Resolve source/target for Excel->i18n conversion.
 * @param {Object} options Options object.
 * @param {Object} defaultConfig Entry defaults.
 * @returns {{sourceFile:string,targetPath:string}}
 */
export function resolveExcelToI18nPaths(options, defaultConfig) {
  const sourceFile =
    options.input || options.targetFile || defaultConfig?.targetFile || '';
  const targetPath =
    options.output || options.targetPath || defaultConfig?.targetPath || '';
  return { sourceFile, targetPath };
}

/**
 * Build common conversion options object.
 * @param {Object} options Options object.
 * @param {Object} defaultConfig Entry defaults.
 * @param {Object} runtimeConfig Runtime config.
 * @param {boolean} isDryRun Dry-run flag.
 * @returns {{sheetName:string,dryRun:boolean,languageMap?:Object,report?:boolean}}
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
 * Resolve fail-on-duplicates flag combining explicit option & argv search.
 * @param {Object} options Options object.
 * @param {string[]} argv Process argv array.
 * @param {string} flagLiteral Long flag literal.
 * @returns {boolean}
 */
export function resolveFailOnDuplicates(options, argv, flagLiteral) {
  return (
    options.failOnDuplicates === true ||
    (Array.isArray(argv) && argv.includes(flagLiteral))
  );
}
