/**
 * Utilities for validating and manipulating JSON structures used in translations.
 * Handles nested object validation, flattening, and setting nested values.
 */

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates that the JSON structure is suitable for translations.
 * Ensures the object is a plain object with nested plain objects and string values only.
 * @param {Object} obj - The object to validate.
 * @param {string} [path=''] - Current path for error reporting.
 * @throws {Error} If the structure contains arrays, non-objects, or non-strings.
 */
export function validateJsonStructure(obj, path = '') {
  if (!isPlainObject(obj)) {
    throw new Error(
      `Invalid structure at "${path || '<root>'}": Must be an object.`,
    );
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') continue;
    if (isPlainObject(value)) {
      validateJsonStructure(value, currentPath);
      continue;
    }
    const foundType = Array.isArray(value) ? 'Array' : typeof value;
    throw new Error(
      `Invalid value at "${currentPath}": Only strings and nested objects allowed, but found: ${foundType}`,
    );
  }
}

/**
 * Ensures that a key in the object is an object, creating it if necessary.
 * @param {Object} obj - The object to modify.
 * @param {string} key - The key to ensure is an object.
 */
export function ensureObjectBranch(obj, key) {
  if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {};
}

/**
 * Sets a value at a nested path in an object, creating intermediate objects as needed.
 * @param {Object} obj - The root object to set the value in.
 * @param {string[]} pathParts - Array of path segments to navigate.
 * @param {*} value - The value to set at the final path.
 */
export function setNestedValue(obj, pathParts, value) {
  if (pathParts.length === 1) {
    obj[pathParts[0]] = value;
    return;
  }
  const [head, ...tail] = pathParts;
  ensureObjectBranch(obj, head);
  setNestedValue(obj[head], tail, value);
}

/**
 * Flattens a nested translation object into flat key-value pairs.
 * Traverses the object recursively, building dotted keys for nested paths.
 * @param {Object} obj - The nested object to flatten.
 * @param {string} prefix - Current prefix for the key path.
 * @param {Function} visit - Callback function called for each leaf value: visit(key, value).
 */
export function flattenTranslations(obj, prefix, visit) {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flattenTranslations(value, newKey, visit);
    } else {
      visit(newKey, value);
    }
  }
}
