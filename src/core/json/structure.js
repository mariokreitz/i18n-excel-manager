function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

export function ensureObjectBranch(obj, key) {
  if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {};
}

export function setNestedValue(obj, pathParts, value) {
  if (pathParts.length === 1) {
    obj[pathParts[0]] = value;
    return;
  }
  const [head, ...tail] = pathParts;
  ensureObjectBranch(obj, head);
  setNestedValue(obj[head], tail, value);
}

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
