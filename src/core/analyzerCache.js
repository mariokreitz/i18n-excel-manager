/**
 * @fileoverview Incremental cache for codebase analysis.
 * Caches per-file translation key extractions keyed by content hash (SHA-256).
 * Falls back to a full scan when cache misses occur.
 * @module core/analyzerCache
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';

/** @constant {string} Default cache file path. */
const DEFAULT_CACHE_PATH = '.i18n-cache.json';

/**
 * Extractor algorithm version.
 * MUST be bumped whenever the PATTERNS constant in `analyzer.js` changes so that
 * cached key sets from a previous run are not re-used with a different extractor.
 * Old entries without this field (or with a different value) are treated as misses.
 * @constant {string}
 */
const CACHE_VERSION = '3';

/**
 * Compute a SHA-256 hash of a string.
 * @param {string} content File content.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
export function hashContent(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Load the cache file from disk. Returns an empty object on any error.
 * @param {string} [cachePath] Path to cache file.
 * @returns {Object<string, {hash: string, keys: string[]}>} Cache entries keyed by file path.
 */
export function loadCache(cachePath = DEFAULT_CACHE_PATH) {
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Write the cache object to disk.
 * @param {Object<string, {hash: string, keys: string[]}>} cache Cache entries.
 * @param {string} [cachePath] Path to cache file.
 */
export function saveCache(cache, cachePath = DEFAULT_CACHE_PATH) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Determine whether a file's cache entry is still valid.
 * The entry must match both the content hash AND the current CACHE_VERSION;
 * entries written by an older extractor are automatically invalidated.
 * @param {Object<string, {v: string, hash: string, keys: string[], sig?: string}>} cache Cache entries.
 * @param {string} filePath Absolute or relative file path.
 * @param {string} contentHash SHA-256 of the current file content.
 * @param {string} [extractorSignature='default'] Signature of active extractor options.
 * @returns {boolean} True if cache is hit.
 */
export function isCacheHit(
  cache,
  filePath,
  contentHash,
  extractorSignature = 'default',
) {
  const entry = cache[filePath];
  return Boolean(
    entry &&
    entry.hash === contentHash &&
    entry.v === CACHE_VERSION &&
    (entry.sig || 'default') === extractorSignature,
  );
}

/**
 * Get cached keys for a file.
 * @param {Object<string, {hash: string, keys: string[]}>} cache
 * @param {string} filePath
 * @returns {string[]} Cached key list.
 */
export function getCachedKeys(cache, filePath) {
  return cache[filePath]?.keys ?? [];
}

/**
 * Update a cache entry for a file.
 * @param {Object<string, {v: string, hash: string, keys: string[], sig?: string}>} cache
 * @param {string} filePath
 * @param {string} hash Content hash.
 * @param {string[]} keys Extracted translation keys.
 * @param {string} [extractorSignature='default'] Signature of active extractor options.
 */
export function updateCacheEntry(
  cache,
  filePath,
  hash,
  keys,
  extractorSignature = 'default',
) {
  // eslint-disable-next-line no-param-reassign
  cache[filePath] = { v: CACHE_VERSION, hash, keys, sig: extractorSignature };
}
