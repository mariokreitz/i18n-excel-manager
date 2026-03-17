/**
 * @fileoverview Gemini translation provider implementation.
 * @module providers/gemini.provider
 */

import { GoogleGenAI } from '@google/genai';

import { TranslationError, TranslationProvider } from './base.js';

/**
 * Gemini-powered translation provider.
 * Uses Gemini models to translate text while preserving placeholders and formatting.
 */
export class GeminiProvider extends TranslationProvider {
  /**
   * @param {string} apiKey Gemini API key.
   * @param {string} [model='gemini-2.5-flash'] Gemini model to use.
   */
  constructor(apiKey, model = 'gemini-2.5-flash') {
    super();
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = model;
  }

  /**
   * @param {string[]} texts Array of source texts to translate.
   * @param {string} sourceLang Source language code.
   * @param {string} targetLang Target language code.
   * @returns {Promise<string[]>} Array of translated texts.
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
        throw new TranslationError('Empty response from Gemini');
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
      throw new TranslationError(`Gemini API Error: ${error.message}`, error);
    }
  }
}
