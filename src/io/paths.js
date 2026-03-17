/**
 * @fileoverview Path validation and safe joining utilities.
 * Provides security functions for language code validation and directory traversal prevention.
 * @module io/paths
 *
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Canonicalize a path using realpath semantics, even when the leaf path does not exist.
 * Walks up to the nearest existing ancestor and rebuilds a canonical candidate path.
 *
 * @param {string} filePath Absolute path candidate.
 * @returns {string} Canonical absolute path.
 * @throws {Error} When no canonical ancestor can be resolved.
 * @internal
 */
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
