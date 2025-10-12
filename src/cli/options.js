// filepath: /Users/mariokreitz/dev/github/i18n-excel-manager/src/cli/options.js
/**
 * Helpers for merging CLI options with config defaults.
 * @module cli/options
 */

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
  const baseDefaults = configOptions?.defaults || defaultConfig || {};
  const merged = Object.assign({}, baseDefaults, cliOptions);

  const lm =
    cliOptions?.languageMap ??
    configOptions?.languages ??
    runtimeConfig?.languages;
  if (lm) merged.languageMap = lm;

  if (!merged.sheetName) {
    merged.sheetName = baseDefaults.sheetName || 'Translations';
  }
  return merged;
}
