/**
 * Centralized option & path resolution helpers consolidating logic from options.js and params.js.
 * Existing modules (options.js, params.js) delegate to these to preserve public imports.
 */

function getBaseDefaults(configOptions, defaultConfig) {
  return configOptions?.defaults || defaultConfig || {};
}

function getIncoming(cliOptions) {
  return cliOptions || {};
}

function resolveLanguageMap(opts, configOptions, runtimeConfig) {
  return (
    opts.languageMap ?? configOptions?.languages ?? runtimeConfig?.languages
  );
}

function ensureSheetName(current, baseDefaults) {
  return current || baseDefaults.sheetName || 'Translations';
}

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

export function resolveI18nToExcelPaths(options, defaultConfig) {
  const sourcePath =
    options.input || options.sourcePath || defaultConfig?.sourcePath || '';
  const targetFile =
    options.output || options.targetFile || defaultConfig?.targetFile || '';
  return { sourcePath, targetFile };
}

export function resolveExcelToI18nPaths(options, defaultConfig) {
  const sourceFile =
    options.input || options.targetFile || defaultConfig?.targetFile || '';
  const targetPath =
    options.output || options.targetPath || defaultConfig?.targetPath || '';
  return { sourceFile, targetPath };
}

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

export function resolveFailOnDuplicates(options, argv, flagLiteral) {
  return (
    options.failOnDuplicates === true ||
    (Array.isArray(argv) && argv.includes(flagLiteral))
  );
}
