/**
 * @fileoverview Translation provider implementations for AI-powered translations.
 * Provides an abstract interface and concrete Gemini implementation.
 * @module core/translator
 */

import { GoogleGenAI } from '@google/genai';

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
 * Gemini-powered translation provider.
 * Uses Gemini models to translate text while preserving placeholders and formatting.
 * @extends TranslationProvider
 */
export class GeminiProvider extends TranslationProvider {
  /**
   * Creates a Gemini translation provider instance.
   *
   * @param {string} apiKey - Gemini API key.
   * @param {string} [model='gemini-2.5-flash'] - Gemini model to use for translations.
   */
  constructor(apiKey, model = 'gemini-2.5-flash') {
    super();
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = model;
  }

  /**
   * Translates a batch of texts using Gemini's generateContent API.
   * Preserves placeholders (e.g., {{value}}), formatting, and HTML tags.
   *
   * @param {string[]} texts - Array of source texts to translate.
   * @param {string} sourceLang - Source language code.
   * @param {string} targetLang - Target language code.
   * @returns {Promise<string[]>} Array of translated texts.
   * @throws {Error} If Gemini API call fails or returns invalid format.
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
      const result = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              translations: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['translations'],
          },
          temperature: 0.2,
        },
      });

      const content = result?.text;
      if (!content) {
        throw new Error('Empty response from Gemini');
      }

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
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }
}
