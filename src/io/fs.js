/**
 * File system utilities for safe file operations.
 * Provides functions for directory creation, file existence checks, and JSON file I/O.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Asserts that the path is a non-empty string.
 * @param {*} p - The path to check.
 * @param {string} label - Label for error message.
 * @throws {TypeError} If path is not a non-empty string.
 */
function assertStringPath(p, label) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

/**
 * Ensures that a directory exists, creating it recursively if necessary.
 * @param {string} dirPath - Path to the directory.
 * @returns {Promise<void>} Resolves when the directory exists.
 * @throws {TypeError} If dirPath is invalid.
 */
export async function ensureDirectoryExists(dirPath) {
  assertStringPath(dirPath, 'dirPath');
  const resolved = path.resolve(dirPath);
  // Path is resolved and controlled by caller; mkdir is safe here.
  await fs.mkdir(resolved, { recursive: true });
}

/**
 * Checks if a file exists at the given path.
 * @param {string} filePath - Path to the file.
 * @returns {Promise<void>} Resolves if file exists.
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
 * Loads and parses a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<Object>} Parsed JSON object.
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
 * Writes data as JSON to a file.
 * @param {string} filePath - Path where the file will be written.
 * @param {*} data - Data to serialize as JSON.
 * @returns {Promise<void>} Resolves when the file is written.
 * @throws {TypeError} If filePath is invalid.
 */
export async function writeJsonFile(filePath, data) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  // Writing to a resolved path; upstream callers control/sanitize path.
  await fs.writeFile(resolved, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Reads all JSON files in a directory and parses them.
 * @param {string} dir - Path to the directory.
 * @returns {Promise<Array<{name: string, data: Object}>>} Array of objects with file name and parsed data.
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
