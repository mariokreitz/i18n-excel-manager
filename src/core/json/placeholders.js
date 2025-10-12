/**
 * Utilities for handling placeholders in translation strings.
 * Extracts and processes placeholder patterns for validation or processing.
 */

/**
 * Extracts placeholder names from a translation text string.
 * Supports both double curly braces {{name}} and single {name} formats.
 * @param {string} text - The text to extract placeholders from.
 * @returns {Set<string>} A set of unique placeholder names found in the text.
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
