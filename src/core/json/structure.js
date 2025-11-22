/**
 * @module core/json/structure
 * Structural utilities for nested translation JSON objects.
 * @typedef {import('../../types.js').TranslationReport} TranslationReport
 */

/**
 * Determines if a value is a plain object (not null, not an array).
 * @param {unknown} value Value to test.
 * @returns {boolean} True when value is a non-null object and not an array.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates translation JSON structure recursively.
 * Ensures every node is either a string leaf or a plain object whose children obey the same rule.
 * @param {Object} obj Root object to validate.
 * @param {string} [path=''] Dot path used for error context.
 * @throws {Error} When a non-string leaf (array, number, etc.) is encountered.
 * @returns {void}
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
 * Guarantee an object branch for a given key, creating if absent.
 * @param {Object} obj Parent object.
 * @param {string} key Key to ensure as object.
 * @returns {void}
 */
export function ensureObjectBranch(obj, key) {
  if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {};
}

/**
 * Set a nested value following path segments, creating intermediate objects.
 * @param {Object} obj Root object.
 * @param {string[]} pathParts Segments representing the nested path.
 * @param {*} value Value to assign at leaf.
 * @returns {void}
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
 * Flatten nested translations into dotted paths.
 * @param {Object} obj Nested translations object.
 * @param {string} prefix Current path prefix.
 * @param {(key:string,value:any)=>void} visit Callback invoked for each leaf entry.
 * @returns {void}
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
