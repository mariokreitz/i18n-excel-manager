/**
 * @fileoverview Backward-compatible shim for legacy core translator imports.
 * Provider implementations now live in src/providers/.
 * @module core/translator
 */

export {
  GeminiProvider,
  TranslationError,
  TranslationProvider,
} from '../providers/index.js';
