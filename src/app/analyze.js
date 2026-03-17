/**
 * @fileoverview Orchestration layer for codebase / i18n analysis.
 * Delegates extraction and comparison to pure core functions;
 * all filesystem I/O is channelled through the IO adapter.
 * @module app/analyze
 */

import {
  analyzeKeys,
  extractKeysFromCodebase,
  flattenKeys,
} from '../core/analyzer.js';

/**
 * Orchestrates the analysis of the codebase and i18n files.
 * @param {import('../types.js').IoAdapter} io - IO adapter.
 * @param {Object} options - Options object.
 * @param {string} options.sourcePath - Path to the i18n JSON directory.
 * @param {string} options.codePattern - Glob pattern for source code scanning.
 * @param {boolean} [options.useCache=false] - Enable incremental key-extraction cache.
 * @param {Object} [deps] - Dependencies (for testing).
 * @param {Function} [deps.extractKeys] - Function to extract keys from codebase.
 * @returns {Promise<{totalCodeKeys: number, fileReports: Object<string, {missing: string[], unused: string[]}>}>} Report object.
 */
export async function analyzeApp(io, options, deps = {}) {
  // Default dependencies
  const extractKeys = deps.extractKeys || extractKeysFromCodebase;

  const { sourcePath, codePattern, useCache } = options;

  // 1. Load all i18n JSON files
  let jsonFiles;
  try {
    jsonFiles = await io.readDirJsonFiles(sourcePath);
  } catch (error) {
    throw new Error(
      `Could not read i18n files from ${sourcePath}: ${error.message}`,
    );
  }

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${sourcePath}`);
  }

  // 2. Extract keys from codebase
  const codeKeys = await extractKeys(codePattern, { useCache });

  // 3. Analyze each file
  const report = {};

  for (const file of jsonFiles) {
    // Flatten the existing JSON keys
    const jsonKeys = flattenKeys(file.data);

    const result = analyzeKeys(codeKeys, jsonKeys);

    report[file.name] = result;
  }

  return {
    totalCodeKeys: codeKeys.size,
    fileReports: report,
  };
}
