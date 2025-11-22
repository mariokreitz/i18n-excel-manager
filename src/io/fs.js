/**
 * @module io/fs
 * Filesystem utility functions (promise-based) for JSON translation assets.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { assertStringPath } from '../core/validation.js';

/**
 * Ensure directory exists (recursive), no-op if already present.
 * @param {string} dirPath Directory path.
 * @returns {Promise<void>}
 * @throws {TypeError} If dirPath is invalid.
 */
export async function ensureDirectoryExists(dirPath) {
  assertStringPath(dirPath, 'dirPath');
  const resolved = path.resolve(dirPath);
  // Path is resolved and controlled by caller; mkdir is safe here.
  await fs.mkdir(resolved, { recursive: true });
}

/**
 * Assert file existence (reject if missing).
 * @param {string} filePath File path to test.
 * @returns {Promise<void>}
 * @throws {TypeError} If filePath is invalid.
 * @throws {Error} If file does not exist.
 */
export async function checkFileExists(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  try {
    await fs.access(resolved);
  } catch {
    throw new Error(`File does not exist: ${filePath}`);
  }
}

/**
 * Read and parse a JSON file.
 * @param {string} filePath JSON file path.
 * @returns {Promise<Object>} Parsed object.
 * @throws {TypeError} If filePath is invalid.
 * @throws {Error} If file reading or JSON parsing fails.
 */
export async function loadJsonFile(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  // Reading a resolved file path; content is validated via JSON.parse.
  const content = await fs.readFile(resolved, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

/**
 * Serialize data as JSON to given path.
 * @param {string} filePath Output file path.
 * @param {*} data Serializable data.
 * @returns {Promise<void>}
 * @throws {TypeError} If filePath is invalid.
 */
export async function writeJsonFile(filePath, data) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  // Writing to a resolved path; upstream callers control/sanitize path.
  await fs.writeFile(resolved, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Read all *.json files inside a directory returning names and parsed data.
 * @param {string} dir Directory path.
 * @returns {Promise<Array<{name:string,data:Object}>>}
 * @throws {TypeError} If dir is invalid.
 * @throws {Error} If directory reading or file parsing fails.
 */
export async function readDirJsonFiles(dir) {
  assertStringPath(dir, 'dir');
  const resolvedDir = path.resolve(dir);
  // List entries in a resolved directory path.
  const files = await fs.readdir(resolvedDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const results = [];
  for (const file of jsonFiles) {
    const full = path.join(resolvedDir, file);
    const data = await loadJsonFile(full);
    results.push({ name: file, data });
  }
  return results;
}
