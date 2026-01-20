/**
 * @fileoverview Filesystem utility functions for JSON translation file operations.
 * Provides promise-based functions for reading, writing, and managing translation assets.
 * @module io/fs
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { assertStringPath } from '../core/validation.js';

/**
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * @param {string} dirPath - Directory path to create.
 * @returns {Promise<void>} Resolves when directory exists.
 * @throws {TypeError} If dirPath is not a valid string.
 * @example
 * await ensureDirectoryExists('./locales/i18n');
 */
export async function ensureDirectoryExists(dirPath) {
  assertStringPath(dirPath, 'dirPath');
  const resolved = path.resolve(dirPath);
  await fs.mkdir(resolved, { recursive: true });
}

/**
 * Asserts that a file exists at the given path.
 *
 * @param {string} filePath - File path to check.
 * @returns {Promise<void>} Resolves if file exists.
 * @throws {TypeError} If filePath is not a valid string.
 * @throws {Error} If file does not exist.
 * @example
 * await checkFileExists('./translations.xlsx');
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
 * Reads and parses a JSON file.
 *
 * @param {string} filePath - Path to JSON file.
 * @returns {Promise<Object>} Parsed JSON object.
 * @throws {TypeError} If filePath is not a valid string.
 * @throws {Error} If file reading or JSON parsing fails.
 * @example
 * const translations = await loadJsonFile('./locales/en.json');
 */
export async function loadJsonFile(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  const content = await fs.readFile(resolved, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

/**
 * Writes data to a JSON file with pretty formatting.
 *
 * @param {string} filePath - Output file path.
 * @param {unknown} data - Data to serialize as JSON.
 * @returns {Promise<void>} Resolves when file is written.
 * @throws {TypeError} If filePath is not a valid string.
 * @example
 * await writeJsonFile('./locales/en.json', { greeting: 'Hello' });
 */
export async function writeJsonFile(filePath, data) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  await fs.writeFile(resolved, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Reads all JSON files in a directory and returns their parsed contents.
 *
 * @param {string} dir - Directory path containing JSON files.
 * @returns {Promise<Array<{name: string, data: Object}>>} Array of objects with filename and parsed data.
 * @throws {TypeError} If dir is not a valid string.
 * @throws {Error} If directory reading or JSON parsing fails.
 * @example
 * const files = await readDirJsonFiles('./locales');
 * // Returns: [{ name: 'en', data: { ... } }, { name: 'de', data: { ... } }]
 */
export async function readDirJsonFiles(dir) {
  assertStringPath(dir, 'dir');
  const resolvedDir = path.resolve(dir);
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
