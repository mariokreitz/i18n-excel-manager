/**
 * @fileoverview Codebase analyzer for finding translation key usage.
 * Scans source code files for translation keys and compares against JSON definitions.
 * @module core/analyzer
 */

import fs from 'node:fs/promises';

import { glob } from 'glob';

import {
  getCachedKeys,
  hashContent,
  isCacheHit,
  loadCache,
  saveCache,
  updateCacheEntry,
} from './analyzerCache.js';

/**
 * Regex patterns to detect translation keys in source code.
 * Supports Angular pipe syntax, TranslateService methods, and directive bindings.
 * @constant {RegExp[]}
 */
const PATTERNS = [
  // Pipe syntax: {{ 'KEY' | translate }} or [attr]="'KEY' | translate"
  /['"]([^'"]+)['"]\s*\|\s*translate/g,
  // TranslateService: this.translate.get('KEY'), .instant("KEY"), .stream('KEY')
  /translate\.(?:get|instant|stream)\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Attribute binding (plain): translate="KEY"
  /translate=['"]([^'"]+)['"]/g,
  // Property binding: [translate]="'KEY'" (outer=double, inner=single)
  /\[translate\]=['"]'([^']+)'['"]/g,
  // Property binding: [translate]='"KEY"' (outer=single, inner=double)
  /\[translate\]=['"]"([^"]+)"['"]/g,
  // Property binding: [translate]="KEY" (bare key, no inner quotes)
  /\[translate\]=['"]([^'"]+)['"]/g,
  // Structural directive: *translate="'KEY'"
  /\*translate=['"]'([^']+)'['"]/g,
  // Structural directive: *translate="KEY" (bare key, no inner quotes)
  /\*translate=['"]([^'"]+)['"]/g,
];

/**
 * Extracts translation keys from source code content.
 * Searches for keys used with Angular translate pipe or TranslateService methods.
 *
 * @param {string} content - Source code file content.
 * @returns {Set<string>} Unique translation keys found in the content.
 * @example
 * const keys = extractKeysFromContent("{{ 'app.title' | translate }}");
 * // Returns: Set(['app.title'])
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
 * Extracts translation keys from all files matching a glob pattern.
 * Uses parallel file reading with graceful error handling.
 *
 * @param {string} pattern - Glob pattern to match source files (e.g., 'src/**\/*.ts').
 * @param {Object} [opts] - Options.
 * @param {boolean} [opts.useCache=false] - If true, use incremental cache (.i18n-cache.json).
 * @returns {Promise<Set<string>>} Set of unique translation keys found.
 * @example
 * const keys = await extractKeysFromCodebase('src/**\/*.{ts,html}');
 */
export async function extractKeysFromCodebase(pattern, opts = {}) {
  const { useCache = false } = opts;
  const files = await glob(pattern, { ignore: 'node_modules/**' });
  const keys = new Set();
  const cache = useCache ? loadCache() : {};

  const readPromises = files.map(async (file) => {
    const content = await fs.readFile(file, 'utf8');

    if (useCache) {
      const contentHash = hashContent(content);
      if (isCacheHit(cache, file, contentHash)) {
        return { cached: true, keys: getCachedKeys(cache, file) };
      }
      const fileKeys = extractKeysFromContent(content);
      updateCacheEntry(cache, file, contentHash, [...fileKeys]);
      return { cached: false, keys: [...fileKeys] };
    }

    return { cached: false, keys: [...extractKeysFromContent(content)] };
  });

  const results = await Promise.allSettled(readPromises);
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      for (const k of result.value.keys) keys.add(k);
    } else {
      // Warn but continue — a single unreadable file should not abort the analysis.
      console.warn(
        `[analyzer] Warning: Could not read "${files[i]}": ${result.reason?.message ?? result.reason}`,
      );
    }
  }

  if (useCache) {
    saveCache(cache);
  }

  return keys;
}

/**
 * Recursively flattens a nested JSON object into dot-notation keys.
 *
 * @param {Object} obj - The nested JSON object to flatten.
 * @param {string} [prefix=''] - Current key prefix for recursion.
 * @returns {Set<string>} Set of all flattened key paths.
 * @example
 * flattenKeys({ app: { title: 'My App' } })
 * // Returns: Set(['app.title'])
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
 * Compares translation keys used in code against those defined in JSON files.
 * Identifies keys that are missing from JSON or unused in code.
 *
 * @param {Set<string>} codeKeys - Keys found in source code.
 * @param {Set<string>} jsonKeys - Keys defined in JSON translation files.
 * @returns {{missing: string[], unused: string[]}} Analysis results.
 * @example
 * const { missing, unused } = analyzeKeys(codeKeys, jsonKeys);
 */
export function analyzeKeys(codeKeys, jsonKeys) {
  const missing = [...codeKeys].filter((k) => !jsonKeys.has(k)).toSorted();
  const unused = [...jsonKeys].filter((k) => !codeKeys.has(k)).toSorted();
  return { missing, unused };
}
