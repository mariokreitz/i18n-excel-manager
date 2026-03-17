/**
 * @module core/model/translationTable
 * Intermediate translation table model shared by conversion adapters.
 */

import {
  flattenTranslations,
  validateJsonStructure,
} from '../json/structure.js';

/**
 * Build a format-agnostic translation table from JSON language files.
 * @param {Array<{name:string,data:Object}>} files Parsed JSON file entries.
 * @returns {{translations: Map<string, Object<string,string>>, languages: string[]}}
 */
export function buildTranslationTableFromJsonFiles(files) {
  const translations = new Map();
  const languageSet = new Set();

  for (const { name, data } of files) {
    const language = name.replace(/\.json$/, '');
    languageSet.add(language);

    validateJsonStructure(data);
    flattenTranslations(data, '', (key, value) => {
      if (!translations.has(key)) {
        translations.set(key, {});
      }
      translations.get(key)[language] = value;
    });
  }

  return {
    translations,
    languages: [...languageSet].toSorted(),
  };
}
