/**
 * @module cli/contracts/translate.contract
 * Command contract normalization for translation commands.
 */

/**
 * Resolve translate workbook input using precedence rules.
 * @param {Object} options CLI options.
 * @param {Object} defaultConfig Effective default config.
 * @returns {string} Workbook path or empty string.
 * @internal
 */
function resolveInput(options, defaultConfig) {
  return options.input || options.targetFile || defaultConfig?.targetFile || '';
}

/**
 * Resolve source language code for translation.
 * @param {Object} options CLI options.
 * @returns {string} Source language code.
 * @internal
 */
function resolveSourceLang(options) {
  return options.sourceLang || 'en';
}

/**
 * Resolve translation model name.
 * @param {Object} options CLI options.
 * @returns {string} Model identifier.
 * @internal
 */
function resolveModel(options) {
  return options.model || 'gemini-2.5-flash';
}

/**
 * Resolve language map for header/code conversions.
 * @param {Object} options CLI options.
 * @param {Object} runtimeConfig Runtime validated config.
 * @returns {Object<string, string>} Language code -> display name map.
 * @internal
 */
function resolveLanguageMap(options, runtimeConfig) {
  return options.languageMap ?? runtimeConfig?.languages ?? {};
}

/**
 * Normalize translate command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @param {Object} runtimeConfig Runtime validated config.
 * @returns {Object} Normalized translate options.
 */
export function normalizeTranslateContract(
  options,
  defaultConfig,
  runtimeConfig,
) {
  return {
    ...options,
    input: resolveInput(options, defaultConfig),
    sourceLang: resolveSourceLang(options),
    model: resolveModel(options),
    languageMap: resolveLanguageMap(options, runtimeConfig),
    format: options.format ?? 'text',
    quiet: options.quiet === true,
  };
}

/**
 * Assert invariants for translate command options.
 * @param {Object} options Normalized translate options.
 * @param {{runtime?: import('../runtime.js').Runtime}} [context] Validation context.
 * @returns {void}
 */
export function assertTranslateInvariants(options, context = {}) {
  if (!options.input) {
    throw new Error('Please provide the Excel file path using --input');
  }

  if (options.provider) {
    return;
  }

  const env = context.runtime?.env || {};
  if (!options.apiKey && !env.GEMINI_API_KEY && !env.I18N_MANAGER_API_KEY) {
    throw new Error(
      'API Key is missing. Pass --api-key or set GEMINI_API_KEY (fallback: I18N_MANAGER_API_KEY).',
    );
  }
}
