/**
 * @module cli/params
 * Public-API stability shim. Re-exports from configResolution.js.
 * External consumers should import from this module, not from configResolution
 * directly, so that internal reorganisations do not break their imports.
 */

export {
  buildCommonOptions,
  resolveExcelToI18nPaths,
  resolveFailOnDuplicates,
  resolveI18nToExcelPaths,
} from './configResolution.js';
