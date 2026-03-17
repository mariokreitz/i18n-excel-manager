/**
 * @fileoverview Provider layer base contracts and shared errors.
 * @module providers/base
 */

/**
 * Error type used by translation providers.
 */
export class TranslationError extends Error {
  /**
   * @param {string} message Error message.
   * @param {Error} [cause] Optional underlying error.
   */
  constructor(message, cause) {
    super(message);
    this.name = 'TranslationError';
    if (cause) this.cause = cause;
  }
}

/**
 * Abstract base class for translation providers.
 * Implementations should override the translateBatch method.
 * @abstract
 */
export class TranslationProvider {
  /**
   * Translates a batch of texts from source to target language.
   * @abstract
   * @param {string[]} texts Array of source texts to translate.
   * @param {string} sourceLang Source language code (e.g. "en").
   * @param {string} targetLang Target language code (e.g. "de").
   * @returns {Promise<string[]>} Array of translated texts in the same order.
   */
  // eslint-disable-next-line no-unused-vars
  async translateBatch(texts, sourceLang, targetLang) {
    throw new Error('Not implemented');
  }
}
