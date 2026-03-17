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
 * Regex patterns to detect translation keys in Angular (ngx-translate) source code.
 *
 * Covers both HTML templates and TypeScript service files:
 *
 * Templates (HTML / inline `template: \`...\`` strings):
 *   - Angular translate pipe: {{ 'KEY' | translate }}  [attr]="'KEY' | translate"
 *   - Attribute directive:    <div translate="KEY">
 *   - Property binding:       [translate]="'KEY'"  [translate]="KEY"
 *   - Structural directive:   *translate="'KEY'"   *translate="KEY"
 *
 * TypeScript (TranslateService — ngx-translate):
 *   - Standard calls:         this.translate.instant('KEY')
 *   - Alternative var name:   this.translateService.instant('KEY')
 *   - No `this.`:             translate.get('KEY')
 *   - TypeScript generics:    this.translate.get<string>('KEY')
 *                             this.translate.get<Observable<string>>('KEY')
 *     ↑ handled by [^(]* which consumes everything up to the opening `(`
 *   - Optional chaining:      this.translate?.instant('KEY')
 *   - Template literal keys:  this.translate.instant(`KEY`)
 *   - With params arg:        this.translate.instant('KEY', { name })
 *   - marker() helper:        marker('KEY')  — ngx-translate-extract-marker
 *
 * NOTE: bump CACHE_VERSION in analyzerCache.js whenever patterns change here so
 *       stale cached extractions are automatically invalidated.
 *
 * @constant {RegExp[]}
 */
const PATTERNS = [
  // ── Templates (HTML / inline template strings) ────────────────────────────

  // Pipe: {{ 'KEY' | translate }}  or  [attr]="'KEY' | translate"
  /['"]([^'"]+)['"]\s*\|\s*translate/g,

  // ── TypeScript — TranslateService (ngx-translate) ─────────────────────────
  // Matches:  translate.instant('KEY')
  //           this.translate.instant('KEY')
  //           this.translateService.instant('KEY')
  //           this.translate.get<string>('KEY')            ← generic via [^(]*
  //           this.translate.get<Observable<string>>('KEY') ← nested generic via [^(]*
  //           this.translate?.instant('KEY')               ← optional chaining
  //           this.translate.instant(`KEY`)                ← backtick literal
  //           this.translate.instant('KEY', params)        ← extra args ignored
  /(?:this\.)?(?:translateService|translate)(?:\.|\?\.)(?:get|instant|stream)[^(]*\(\s*['"`]([^'"`\n]+)['"`]/g,

  // ── TypeScript — marker() (ngx-translate-extract-marker) ──────────────────
  // marker('KEY')  — registers keys that appear only in dynamic/table-driven usage
  /\bmarker\s*\(\s*['"`]([^'"`\n]+)['"`]/g,

  // ── HTML attribute directive ───────────────────────────────────────────────

  // translate="KEY"  (plain attribute — key without inner quotes)
  /translate=['"]([^'"]+)['"]/g,

  // ── HTML [translate] property binding ─────────────────────────────────────

  // [translate]="'KEY'"  (double outer, single inner)
  /\[translate\]=['"]'([^']+)'['"]/g,
  // [translate]='"KEY"'  (single outer, double inner)
  /\[translate\]=['"]"([^"]+)"['"]/g,
  // [translate]="KEY"    (bare key, no inner quotes)
  /\[translate\]=['"]([^'"]+)['"]/g,

  // ── HTML *translate structural directive ───────────────────────────────────

  // *translate="'KEY'"
  /\*translate=['"]'([^']+)'['"]/g,
  // *translate="KEY"     (bare key, no inner quotes)
  /\*translate=['"]([^'"]+)['"]/g,
];

/**
 * Extracts translation keys from source code content.
 *
 * Handles all Angular (ngx-translate) usage patterns across HTML templates and
 * TypeScript files, including TypeScript generic type arguments on TranslateService
 * calls, optional chaining, backtick template literals, and the `marker()` helper.
 *
 * @param {string} content - Source code file content (.ts or .html).
 * @returns {Set<string>} Unique translation keys found in the content.
 * @example
 * // HTML template
 * extractKeysFromContent("{{ 'app.title' | translate }}");
 * // Returns: Set(['app.title'])
 *
 * @example
 * // TypeScript — generic call (previously undetected)
 * extractKeysFromContent("this.translate.get<string>('app.title')");
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
