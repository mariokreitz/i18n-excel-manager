import {
  extractKeysFromCodebase,
  flattenKeys,
  analyzeKeys,
} from '../core/analyzer.js';

/**
 * Orchestrates the analysis of the codebase and i18n files.
 * @param {object} io - IO adapter.
 * @param {object} options - Options object.
 * @param {string} options.sourcePath - Path to the i18n JSON directory.
 * @param {string} options.codePattern - Glob pattern for source code scanning.
 * @param {object} [deps] - Dependencies (for testing).
 * @param {Function} [deps.extractKeys] - Function to extract keys from codebase.
 * @returns {Promise<object>} Report object.
 */
export async function analyzeApp(io, options, deps = {}) {
  // Default dependencies
  const extractKeys = deps.extractKeys || extractKeysFromCodebase;

  const { sourcePath, codePattern } = options;

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
  // If codePattern is relative, resolve it relative to CWD, assuming caller passed it that way
  // or rely on glob to handle it.
  const codeKeys = await extractKeys(codePattern);

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
