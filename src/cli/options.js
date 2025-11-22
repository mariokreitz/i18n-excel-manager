/**
 * Helpers for merging CLI options with config defaults.
 * @module cli/options
 */

import { mergeCliOptions as coreMergeCliOptions } from './configResolution.js';

export function mergeCliOptions(
  cliOptions,
  configOptions,
  defaultConfig,
  runtimeConfig,
) {
  return coreMergeCliOptions(
    cliOptions,
    configOptions,
    defaultConfig,
    runtimeConfig,
  );
}
