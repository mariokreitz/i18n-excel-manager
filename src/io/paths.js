import path from 'node:path';

const IS_ALNUM = /^[\dA-Za-z]+$/;
const SEGMENT_SPLIT = /[_-]/;

export function validateLanguageCode(lang) {
  if (typeof lang !== 'string') {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  const parts = lang.split(SEGMENT_SPLIT);
  if (parts.length === 0) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  // First segment length 2-3, alnum only
  if (parts[0].length < 2 || parts[0].length > 3 || !IS_ALNUM.test(parts[0])) {
    throw new TypeError(`Invalid language code: ${lang}`);
  }
  // Subsequent segments must be non-empty and alnum
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].length === 0 || !IS_ALNUM.test(parts[i])) {
      throw new TypeError(`Invalid language code: ${lang}`);
    }
  }
  return lang;
}

export function safeJoinWithin(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.resolve(resolvedBase, filename);
  const rel = path.relative(resolvedBase, candidate);
  if (rel === '' || rel === '.') return candidate; // exact base dir
  // If rel starts with '..' or is absolute, it's outside the base
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe output path: ${candidate}`);
  }
  return candidate;
}
