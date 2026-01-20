/**
 * @fileoverview Translation provider implementations for AI-powered translations.
 * Provides an abstract interface and concrete OpenAI implementation.
 * @module core/translator
 */

import OpenAI from 'openai';

/**
 * Abstract base class for translation providers.
 * Implementations should override the translateBatch method.
 * @abstract
 */
export class TranslationProvider {
  /**
   * Translates a batch of texts from source to target language.
   *
   * @abstract
   * @param {string[]} texts - Array of source texts to translate.
   * @param {string} sourceLang - Source language code (e.g., 'en').
   * @param {string} targetLang - Target language code (e.g., 'de').
   * @returns {Promise<string[]>} Array of translated texts in the same order.
   * @throws {Error} Always throws in base class - must be implemented by subclass.
   */
  // eslint-disable-next-line no-unused-vars
  async translateBatch(texts, sourceLang, targetLang) {
    throw new Error('Not implemented');
  }
}

/**
 * OpenAI-powered translation provider.
 * Uses GPT models to translate text while preserving placeholders and formatting.
 * @extends TranslationProvider
 */
export class OpenAIProvider extends TranslationProvider {
  /**
   * Creates an OpenAI translation provider instance.
   *
   * @param {string} apiKey - OpenAI API key.
   * @param {string} [model='gpt-4o-mini'] - OpenAI model to use for translations.
   */
  constructor(apiKey, model = 'gpt-4o-mini') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Translates a batch of texts using OpenAI's chat completion API.
   * Preserves placeholders (e.g., {{value}}), formatting, and HTML tags.
   *
   * @param {string[]} texts - Array of source texts to translate.
   * @param {string} sourceLang - Source language code.
   * @param {string} targetLang - Target language code.
   * @returns {Promise<string[]>} Array of translated texts.
   * @throws {Error} If OpenAI API call fails or returns invalid format.
   * @example
   * const translations = await provider.translateBatch(
   *   ['Hello', 'Welcome {{name}}'],
   *   'en',
   *   'de'
   * );
   */
  async translateBatch(texts, sourceLang, targetLang) {
    if (texts.length === 0) return [];

    const prompt = `
You are a professional translator for software internationalization (i18n).
Translate the following texts from "${sourceLang}" to "${targetLang}".
Return the result as a JSON object with a key "translations" containing an array of strings.
Preserve ALL formatting, placeholders (e.g. {{value}}), and HTML tags exactly.
Input Texts:
${JSON.stringify(texts)}
`;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.translations)) {
        throw new TypeError(
          'Invalid response format: expected "translations" array',
        );
      }

      if (parsed.translations.length !== texts.length) {
        console.warn(
          `[Translator] Warning: Sent ${texts.length} texts, got ${parsed.translations.length} back. Manual verification suggested.`,
        );
      }

      return parsed.translations;
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }
}
