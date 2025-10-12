import { extractPlaceholders } from '../json/placeholders.js';

function computeMissingLangs(languages, langValues) {
  const res = [];
  for (const lang of languages) {
    if (
      !Object.prototype.hasOwnProperty.call(langValues, lang) ||
      langValues[lang] === ''
    ) {
      res.push(lang);
    }
  }
  return res;
}

function buildPlaceholderMap(languages, langValues) {
  const map = {};
  for (const lang of languages) {
    const val = langValues[lang] || '';
    map[lang] = extractPlaceholders(val);
  }
  return map;
}

function collectAllPlaceholders(placeholderMap) {
  const all = new Set();
  for (const s of Object.values(placeholderMap)) {
    s.forEach((ph) => all.add(ph));
  }
  return all;
}

function hasPlaceholderInconsistency(
  placeholderMap,
  allPlaceholders,
  languages,
) {
  for (const lang of languages) {
    const placeholders = placeholderMap[lang];
    for (const ph of allPlaceholders) {
      if (!placeholders.has(ph)) return true;
    }
  }
  return false;
}

export function generateTranslationReport(translations, languages) {
  const missing = [];
  const duplicates = [];
  const placeholderInconsistencies = [];
  const seen = new Set();

  for (const [key, langValues] of translations.entries()) {
    // Missing
    const missingLangs = computeMissingLangs(languages, langValues);
    for (const lang of missingLangs) missing.push({ key, lang });

    // Duplicates
    if (seen.has(key)) duplicates.push(key);
    else seen.add(key);

    // Placeholder consistency
    const placeholderMap = buildPlaceholderMap(languages, langValues);
    const allPlaceholders = collectAllPlaceholders(placeholderMap);
    if (
      hasPlaceholderInconsistency(placeholderMap, allPlaceholders, languages)
    ) {
      placeholderInconsistencies.push({ key, placeholders: placeholderMap });
    }
  }

  return { missing, duplicates, placeholderInconsistencies };
}
