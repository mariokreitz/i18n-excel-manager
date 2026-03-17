/**
 * @module cli/contracts/analyze.contract
 * Command contract normalization for analysis commands.
 */

/**
 * Normalize analyze command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @returns {Object} Normalized analyze options.
 */
export function normalizeAnalyzeContract(options, defaultConfig) {
  return {
    ...options,
    input:
      options.input || options.sourcePath || defaultConfig?.sourcePath || '',
    pattern: options.pattern ?? '**/*.{html,ts,js}',
    cache: options.cache !== false,
    format: options.format ?? 'text',
    quiet: options.quiet === true,
  };
}

/**
 * Assert invariants for analyze command options.
 * @param {Object} options Normalized analyze options.
 * @returns {void}
 */
export function assertAnalyzeInvariants(options) {
  if (!options.input) {
    throw new Error('Please provide a source path using --input');
  }
}

/**
 * Normalize analyze+translate composed command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @returns {Object} Normalized composed command options.
 */
export function normalizeAnalyzeThenTranslateContract(options, defaultConfig) {
  const normalized = normalizeAnalyzeContract(options, defaultConfig);
  return {
    ...normalized,
    excelInput:
      normalized.excelInput ||
      normalized.targetFile ||
      defaultConfig?.targetFile ||
      '',
  };
}

/**
 * Assert invariants for analyze+translate composed flow.
 * @param {Object} options Normalized composed command options.
 * @returns {void}
 */
export function assertAnalyzeThenTranslateInvariants(options) {
  assertAnalyzeInvariants(options);

  if (options.watch) {
    throw new Error('Cannot combine --watch and --translate on analyze.');
  }

  if (/\.xlsx$/i.test(String(options.input || ''))) {
    return;
  }

  if (!options.excelInput) {
    throw new Error(
      'Please provide --excel-input when using analyze --translate, or set defaults.targetFile in config.',
    );
  }
}
