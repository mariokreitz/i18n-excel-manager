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

/** @constant {string[]} Default object-property names treated as translation key fields. */
export const DEFAULT_METADATA_KEY_FIELDS = ['titleKey', 'descriptionKey'];

/**
 * Escape user-provided text for safe interpolation into RegExp patterns.
 * @param {string} value Raw text.
 * @returns {string} Regex-safe text.
 * @internal
 */
function escapeForRegex(value) {
  return String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Normalize metadata field names to a deterministic unique list.
 * @param {unknown} metadataKeyFields Candidate list of property names.
 * @returns {string[]} Sanitized field names.
 * @internal
 */
function normalizeMetadataKeyFields(metadataKeyFields) {
  if (!Array.isArray(metadataKeyFields)) {
    return [...DEFAULT_METADATA_KEY_FIELDS];
  }

  const clean = metadataKeyFields
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  return clean.length > 0
    ? [...new Set(clean)]
    : [...DEFAULT_METADATA_KEY_FIELDS];
}

/**
 * Extract translation keys from configured metadata fields (e.g. titleKey).
 * @param {string} content Source content.
 * @param {string[]} metadataKeyFields Property names to match.
 * @returns {Set<string>} Keys found in metadata fields.
 * @internal
 */
function extractMetadataKeysFromContent(content, metadataKeyFields) {
  if (metadataKeyFields.length === 0) {
    return new Set();
  }

  const alternation = metadataKeyFields
    .map((fieldName) => escapeForRegex(fieldName))
    .join('|');
  const regex = new RegExp(
    `(?:['"])?(?:${alternation})(?:['"])?\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`,
    'g',
  );

  const keys = new Set();
  for (const match of content.matchAll(regex)) {
    if (match[1]) keys.add(match[1]);
  }

  return keys;
}

/**
 * Find `const foo = ['A', 'B']`-style string arrays in content.
 * @param {string} content Source content.
 * @returns {Map<string, string[]>} Variable name -> string literal values.
 * @internal
 */
function collectLiteralStringArrays(content) {
  const declarationStartRegex = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
  const stringRegex = /['"`]([^'"`\n]+)['"`]/g;
  const arrays = new Map();

  for (const declarationMatch of content.matchAll(declarationStartRegex)) {
    const variableName = declarationMatch[1];
    const declarationStart = declarationMatch.index ?? -1;
    if (declarationStart < 0) continue;

    const openingBracketIndex = content.indexOf('[', declarationStart);
    if (openingBracketIndex === -1) continue;

    const closingBracketIndex = content.indexOf(']', openingBracketIndex + 1);
    if (closingBracketIndex === -1) continue;

    const rawArrayBody = content.slice(
      openingBracketIndex + 1,
      closingBracketIndex,
    );
    const values = [];

    for (const valueMatch of rawArrayBody.matchAll(stringRegex)) {
      if (valueMatch[1]) {
        values.push(valueMatch[1]);
      }
    }

    if (values.length > 0) {
      arrays.set(variableName, [...new Set(values)]);
    }
  }

  return arrays;
}

/**
 * Merge settled extraction results into a unique key set.
 * Logs non-fatal file read errors without aborting analysis.
 * @param {PromiseSettledResult<{cached:boolean,keys:string[]}>[]} results Settled file extraction results.
 * @param {string[]} files Source files aligned with result indexes.
 * @param {Set<string>} keys Destination key set.
 * @returns {void}
 * @internal
 */
function mergeExtractionResults(results, files, keys) {
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      for (const key of result.value.keys) keys.add(key);
      continue;
    }

    // Warn but continue — a single unreadable file should not abort the analysis.
    console.warn(
      `[analyzer] Warning: Could not read "${files[index]}": ${result.reason?.message ?? result.reason}`,
    );
  }
}

/**
 * Persist cache to disk when enabled.
 * @param {boolean} useCache Whether cache is enabled.
 * @param {Object} cache Cache object.
 * @returns {void}
 * @internal
 */
function persistCacheIfEnabled(useCache, cache) {
  if (useCache) {
    saveCache(cache);
  }
}

/**
 * Resolve unique files for one or many glob patterns.
 * @param {string[]} patterns Normalized glob patterns.
 * @returns {Promise<string[]>} Unique file paths.
 * @internal
 */
async function resolveFilesForPatterns(patterns) {
  const filesByPattern = await Promise.all(
    patterns.map((p) => glob(p, { ignore: 'node_modules/**' })),
  );
  return [...new Set(filesByPattern.flat())];
}

/**
 * Resolve extractor options and cache signature.
 * @param {{metadataKeyFields?: string[]}} opts Extractor options.
 * @returns {{normalizedMetadataKeyFields: string[], extractorSignature: string}}
 * @internal
 */
function resolveExtractorContext(opts) {
  const normalizedMetadataKeyFields = normalizeMetadataKeyFields(
    opts.metadataKeyFields,
  );
  const extractorSignature = `meta:${normalizedMetadataKeyFields.join(',')}`;
  return { normalizedMetadataKeyFields, extractorSignature };
}

/**
 * Extract keys for a single file, optionally using cache.
 * @param {string} file File path.
 * @param {Object} context Extraction context.
 * @param {boolean} context.useCache Whether cache is enabled.
 * @param {Object} context.cache Cache object.
 * @param {string[]} context.normalizedMetadataKeyFields Effective metadata key fields.
 * @param {string} context.extractorSignature Cache extractor signature.
 * @returns {Promise<{cached: boolean, keys: string[]}>}
 * @internal
 */
async function extractKeysForFile(file, context) {
  const { useCache, cache, normalizedMetadataKeyFields, extractorSignature } =
    context;

  const content = await fs.readFile(file, 'utf8');

  if (useCache) {
    const contentHash = hashContent(content);
    if (isCacheHit(cache, file, contentHash, extractorSignature)) {
      return { cached: true, keys: getCachedKeys(cache, file) };
    }

    const fileKeys = extractKeysFromContent(content, {
      metadataKeyFields: normalizedMetadataKeyFields,
    });
    updateCacheEntry(
      cache,
      file,
      contentHash,
      [...fileKeys],
      extractorSignature,
    );
    return { cached: false, keys: [...fileKeys] };
  }

  return {
    cached: false,
    keys: [
      ...extractKeysFromContent(content, {
        metadataKeyFields: normalizedMetadataKeyFields,
      }),
    ],
  };
}

/**
 * Extract keys from literal string arrays referenced by translate calls.
 * Supports direct variable usage and map/forEach callback patterns.
 * @param {string} content Source content.
 * @returns {Set<string>} Keys inferred from array-driven translate usage.
 * @internal
 */
function extractArrayDrivenTranslateKeys(content) {
  const keys = new Set();
  const arrays = collectLiteralStringArrays(content);
  if (arrays.size === 0) {
    return keys;
  }

  const translateIdentifierCallRegex =
    /(?:this\.)?(?:translateService|translate)(?:\.|\?\.)(?:get|instant|stream)[^(]*\(\s*([A-Za-z_$][\w$]*)\b/g;
  for (const match of content.matchAll(translateIdentifierCallRegex)) {
    const referenced = match[1];
    const arrayValues = arrays.get(referenced);
    if (!arrayValues) continue;
    for (const key of arrayValues) keys.add(key);
  }

  const iteratorTranslateCallRegex =
    /\b([A-Za-z_$][\w$]*)\s*\.\s*(?:map|forEach)\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\b[\s\S]*?(?:translateService|translate)(?:\.|\?\.)(?:get|instant|stream)[^(]*\(\s*\2\b/g;
  for (const match of content.matchAll(iteratorTranslateCallRegex)) {
    const arrayName = match[1];
    const arrayValues = arrays.get(arrayName);
    if (!arrayValues) continue;
    for (const key of arrayValues) keys.add(key);
  }

  return keys;
}

/**
 * Extracts translation keys from source code content.
 *
 * Handles all Angular (ngx-translate) usage patterns across HTML templates and
 * TypeScript files, including TypeScript generic type arguments on TranslateService
 * calls, optional chaining, backtick template literals, and the `marker()` helper.
 *
 * @param {string} content - Source code file content (.ts or .html).
 * @param {{metadataKeyFields?: string[]}} [opts] Extraction options.
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
export function extractKeysFromContent(content, opts = {}) {
  const keys = new Set();
  const metadataKeyFields = normalizeMetadataKeyFields(opts.metadataKeyFields);

  for (const regex of PATTERNS) {
    const matches = content.matchAll(regex);
    for (const m of matches) {
      if (m[1]) {
        keys.add(m[1]);
      }
    }
  }

  for (const metadataKey of extractMetadataKeysFromContent(
    content,
    metadataKeyFields,
  )) {
    keys.add(metadataKey);
  }

  for (const arrayDrivenKey of extractArrayDrivenTranslateKeys(content)) {
    keys.add(arrayDrivenKey);
  }

  return keys;
}

/**
 * Normalize one or many glob patterns into a deterministic list.
 * @param {string|string[]} pattern Glob pattern(s) to scan.
 * @returns {string[]} Non-empty patterns.
 * @internal
 */
function normalizePatterns(pattern) {
  if (Array.isArray(pattern)) {
    return pattern.map((p) => String(p).trim()).filter((p) => p.length > 0);
  }
  if (typeof pattern === 'string') {
    const trimmed = pattern.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

/**
 * Extracts translation keys from all files matching a glob pattern.
 * Uses parallel file reading with graceful error handling.
 *
 * @param {string|string[]} pattern - Glob pattern(s) to match source files (e.g., 'src/**\/*.ts').
 * @param {Object} [opts] - Options.
 * @param {boolean} [opts.useCache=false] - If true, use incremental cache (.i18n-cache.json).
 * @returns {Promise<Set<string>>} Set of unique translation keys found.
 * @example
 * const keys = await extractKeysFromCodebase('src/**\/*.{ts,html}');
 */
export async function extractKeysFromCodebase(pattern, opts = {}) {
  const { useCache = false, metadataKeyFields } = opts;
  const patterns = normalizePatterns(pattern);
  if (patterns.length === 0) {
    return new Set();
  }

  const files = await resolveFilesForPatterns(patterns);
  const keys = new Set();
  const cache = useCache ? loadCache() : {};
  const { normalizedMetadataKeyFields, extractorSignature } =
    resolveExtractorContext({ metadataKeyFields });

  const readPromises = files.map((file) =>
    extractKeysForFile(file, {
      useCache,
      cache,
      normalizedMetadataKeyFields,
      extractorSignature,
    }),
  );

  const results = await Promise.allSettled(readPromises);
  mergeExtractionResults(results, files, keys);
  persistCacheIfEnabled(useCache, cache);

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
