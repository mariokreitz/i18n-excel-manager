/**
 * @module cli/contracts/init.contract
 * Command contract normalization for init command.
 */

/**
 * Normalize init command options.
 * @param {Object} options Merged CLI options.
 * @param {Object} defaultConfig Entry default config.
 * @returns {Object} Normalized init options.
 */
export function normalizeInitContract(options, defaultConfig) {
  return {
    ...options,
    output: options.output || defaultConfig?.sourcePath || '',
    format: options.format ?? 'text',
    quiet: options.quiet === true,
  };
}

/**
 * Assert invariants for init command options.
 * @param {Object} options Normalized init options.
 * @returns {void}
 */
export function assertInitInvariants(options) {
  if (!options.output) {
    throw new Error('Please provide an output path using --output');
  }
}
