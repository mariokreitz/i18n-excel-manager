/**
 * @module cli/options
 * Public-API stability shim. Re-exports from configResolution.js.
 * External consumers should import from this module, not from configResolution
 * directly, so that internal reorganisations do not break their imports.
 */

export { mergeCliOptions } from './configResolution.js';
