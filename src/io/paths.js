/**
 * @fileoverview Path validation and safe joining utilities.
 * Provides security functions for language code validation and directory traversal prevention.
 * @module io/paths
 *
 * NOTE: validateLanguageCode lives in core/validation.js (pure logic, no FS dependency).
 * It is re-exported here for backward compatibility with existing consumers.
 */

import fs from 'node:fs';
import path from 'node:path';

// Re-export from core so existing imports of validateLanguageCode from io/paths keep working.
export { validateLanguageCode } from '../core/validation.js';

function toCanonicalPath(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    let current = path.dirname(filePath);
    while (true) {
      try {
        const currentReal = fs.realpathSync(current);
        return path.join(currentReal, path.relative(current, filePath));
      } catch {
        const parent = path.dirname(current);
        if (parent === current) {
          throw new Error(`Unsafe output path: ${filePath}`);
        }
        current = parent;
      }
    }
  }
}

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
  const realBase = toCanonicalPath(resolvedBase);
  const candidate = path.resolve(realBase, filename);

  // Canonicalize candidate path (or nearest existing parent for new files)
  // to prevent symlink escapes outside the trusted base directory.
  const canonicalCandidate = toCanonicalPath(candidate);

  const rel = path.relative(realBase, canonicalCandidate);
  if (rel === '' || rel === '.') return canonicalCandidate;
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Unsafe output path: ${canonicalCandidate}`);
  }
  return canonicalCandidate;
}
