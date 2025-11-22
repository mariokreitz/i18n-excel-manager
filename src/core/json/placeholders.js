/**
 * @module core/json/placeholders
 * Placeholder extraction utilities for translation strings.
 */

/**
 * Extract placeholder names from a translation string.
 * Supports formats: {name} and {{name}}.
 * Trims internal whitespace inside braces.
 * @param {string} text Source text.
 * @returns {Set<string>} Unique placeholder identifiers.
 * @example
 * extractPlaceholders('Hello {user}, balance {{ amount }}') // => Set(['user','amount'])
 */
export function extractPlaceholders(text) {
  const placeholders = new Set();
  if (typeof text !== 'string') return placeholders;
  const regex = /{{?\s*([^{}]+?)\s*}}?/g;
  let match;
  while ((match = regex.exec(text))) {
    placeholders.add(match[1].trim());
  }
  return placeholders;
}
