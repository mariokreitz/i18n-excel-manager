/**
 * Helpers for merging CLI options with config defaults.
 * @module cli/options
 */

function resolveBaseDefaults(configOptions, defaultConfig) {
  return configOptions?.defaults || defaultConfig || {};
}

function resolveLanguageMap(cliOptions, configOptions, runtimeConfig) {
  return (
    cliOptions?.languageMap ??
    configOptions?.languages ??
    runtimeConfig?.languages
  );
}

function ensureSheetName(merged, baseDefaults) {
  return merged.sheetName || baseDefaults.sheetName || 'Translations';
}

/**
 * Merge configuration coming from the config file and CLI, with clear precedence.
 *
 * Precedence rules
 * - CLI options override config file defaults.
 * - Config file defaults override runtime defaults (`defaultConfig`).
 * - languageMap precedence: CLI > config.languages > runtime config.languages.
 *
 * @param {object} cliOptions - The raw CLI options object.
 * @param {object} configOptions - The loaded config file object (may contain {defaults, languages}).
 * @param {object} defaultConfig - Runtime default config used by the CLI entrypoint.
 * @param {object} runtimeConfig - Runtime validated config (from validateConfigObject) that may contain languages.
 * @returns {object} A new merged options object with resolved `languageMap` and `sheetName`.
 * @example
 * const merged = mergeCliOptions(opts, fileCfg, defaultCfg, CONFIG);
 */
export function mergeCliOptions(
  cliOptions,
  configOptions,
  defaultConfig,
  runtimeConfig,
) {
  const baseDefaults = resolveBaseDefaults(configOptions, defaultConfig);
  const opts = cliOptions || {};
  const merged = { ...baseDefaults, ...opts };
  const lm = resolveLanguageMap(opts, configOptions, runtimeConfig);
  if (lm) merged.languageMap = lm;
  merged.sheetName = ensureSheetName(merged, baseDefaults);
  return merged;
}
