/**
 * @fileoverview Path validation and safe joining utilities.
 * Provides security functions for language code validation and directory traversal prevention.
 * @module io/paths
 *
 * NOTE: validateLanguageCode lives in core/validation.js (pure logic, no FS dependency).
 * It is re-exported here for backward compatibility with existing consumers.
 */

import path from 'node:path';

// Re-export from core so existing imports of validateLanguageCode from io/paths keep working.
export { validateLanguageCode } from '../core/validation.js';

/**
 * Safely joins a filename to a base directory, preventing directory traversal attacks.
 *
 * Ensures the resulting path is within the base directory by checking that
 * the resolved path doesn't escape upward using '..' or absolute paths.
 *
 * @param {string} baseDir - The base directory path.
 * @param {string} filename - The filename to join.
 * @returns {string} The safe absolute path.
 * @throws {Error} If the resulting path would be outside the base directory.
 * @example
 * safeJoinWithin('./locales', 'en.json');     // Returns: '/abs/path/locales/en.json'
 * safeJoinWithin('./locales', '../etc/passwd'); // Throws: Error
 */
export function safeJoinWithin(baseDir, filename) {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.resolve(resolvedBase, filename);
  const rel = path.relative(resolvedBase, candidate);
  if (rel === '' || rel === '.') return candidate;
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe output path: ${candidate}`);
  }
  return candidate;
}
