import fs from 'node:fs/promises';

import { glob } from 'glob';

/**
 * Regex patters to find translation keys in source code.
 * Optimized for Angular but generic enough for many JS/TS frameworks.
 */
const PATTERNS = [
  // Pipe usage: 'KEY' | translate
  /['"]([^'"]+)['"]\s*\|\s*translate/g,
  // Function usage: translate.get('KEY') or .instant('KEY') or .stream('KEY')
  /translate\.(?:get|instant|stream)\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Directive usage: translate="KEY" or [translate]="'KEY'"
  /translate=['"]([^'"]+)['"]/g,
  /\[translate\]=['"]'([^']+)'['"]/g,
  // Structural directive: *translate="'KEY'"
  /\*translate=['"]'([^']+)'['"]/g,
];

/**
 * Extracts translation keys from a string content.
 * @param {string} content File content.
 * @returns {Set<string>} Keys found.
 */
export function extractKeysFromContent(content) {
  const keys = new Set();
  for (const regex of PATTERNS) {
    const matches = content.matchAll(regex);
    for (const m of matches) {
      if (m[1]) {
        keys.add(m[1]);
      }
    }
  }
  return keys;
}

/**
 * Extracts translation keys from files matching the pattern.
 * @param {string} pattern Glob pattern to search for files.
 * @returns {Promise<Set<string>>} Set of unique keys found.
 */
export async function extractKeysFromCodebase(pattern) {
  const files = await glob(pattern, { ignore: 'node_modules/**' });
  const keys = new Set();

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const fileKeys = extractKeysFromContent(content);
      for (const k of fileKeys) keys.add(k);
    } catch (error) {
      console.warn(`[Analyzer] Could not read file: ${file}`, error.message);
    }
  }

  return keys;
}

/**
 * flattenKeys - Recursively flattens a JSON object into dot-notation keys.
 * @param {object} obj - The JSON object.
 * @param {string} prefix - The current prefix.
 * @returns {Set<string>} - A Set of all keys.
 */
export function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      const childKeys = flattenKeys(value, newKey);
      for (const k of childKeys) keys.add(k);
    } else {
      keys.add(newKey);
    }
  }
  return keys;
}

/**
 * Compares code usage against defined keys.
 * @param {Set<string>} codeKeys - Keys found in the source code.
 * @param {Set<string>} jsonKeys - Keys defined in the JSON files.
 * @returns {object} { missing: string[], unused: string[] }
 */
export function analyzeKeys(codeKeys, jsonKeys) {
  const missing = [];
  const unused = [];

  for (const k of codeKeys) {
    if (!jsonKeys.has(k)) {
      missing.push(k);
    }
  }

  for (const k of jsonKeys) {
    if (!codeKeys.has(k)) {
      unused.push(k);
    }
  }

  return { missing: missing.toSorted(), unused: unused.toSorted() };
}
