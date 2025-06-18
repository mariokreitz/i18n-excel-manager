/**
 * Main module for i18n-to-excel
 * Contains the core functionality for converting between i18n JSON and Excel files
 *
 * @module main
 */

import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

/**
 * Validates the structure of a JSON object.
 * Only strings as values are allowed, no arrays, no functions, no nulls.
 * @param {Object} obj - The object to check
 * @param {string} [path=''] - Current path for error messages
 * @throws {Error} On invalid structure
 */
export function validateJsonStructure(obj, path = '') {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error(`Invalid structure at "${path || '<root>'}": Must be an object.`);
  }
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      validateJsonStructure(value, currentPath);
    } else {
      throw new Error(`Invalid value at "${currentPath}": Only strings and nested objects allowed, but found: ${Array.isArray(value) ? 'Array' : typeof value}`);
    }
  }
}

/**
 * Converts i18n JSON files to an Excel file
 *
 * @async
 * @param {string} sourcePath - Folder path with the i18n JSON files
 * @param {string} targetFile - Path to the target Excel file
 * @param {Object} [options] - Additional options
 * @param {string} [options.sheetName='Translations'] - Name of the Excel sheet
 * @param {boolean} [options.dryRun=false] - If true, do not write file
 * @throws {Error} If the source path does not exist or contains no JSON files
 * @returns {Promise<void>}
 */
export async function convertToExcel(sourcePath, targetFile, options = {}) {
  const sheetName = options.sheetName || 'Translations';
  const dryRun = !!options.dryRun;
  try {
    // Check if the source path exists
    await fs.access(sourcePath).catch(() => {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    });

    // Read files in the source directory
    const files = await fs.readdir(sourcePath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in directory: ${sourcePath}`);
    }

    // All translations as a map from keys to language objects
    const translations = new Map();
    const languages = [];

    // Process JSON files
    for (const file of jsonFiles) {
      const language = path.basename(file, '.json');
      languages.push(language);
      const content = await fs.readFile(path.join(sourcePath, file), 'utf8');
      const jsonData = JSON.parse(content);
      validateJsonStructure(jsonData);
      flattenTranslations(jsonData, '', (key, value) => {
        if (!translations.has(key)) {
          translations.set(key, {});
        }
        translations.get(key)[language] = value;
      });
    }

    // Output report in dry-run mode
    if (dryRun) {
      const report = generateTranslationReport(translations, languages);
      printTranslationReport(report);
      return;
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add header row
    const headerRow = ['Key', ...languages];
    worksheet.addRow(headerRow);

    // Add all translations
    for (const [key, langValues] of translations.entries()) {
      const row = [key];
      for (const lang of languages) {
        row.push(langValues[lang] || '');
      }
      worksheet.addRow(row);
    }

    // Improve formatting and layout
    worksheet.columns.forEach(column => {
      column.width = 40;
    });
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Save Excel file (except in dry-run)
    if (!dryRun) {
      await workbook.xlsx.writeFile(targetFile);
    }
  } catch (error) {
    throw new Error(`Error converting to Excel: ${error.message}`);
  }
}

/**
 * Converts an Excel file back to i18n JSON files
 *
 * @async
 * @param {string} sourceFile - Path to the source Excel file
 * @param {string} targetPath - Target folder for the JSON files
 * @param {Object} [options] - Additional options
 * @param {string} [options.sheetName='Translations'] - Name of the Excel sheet
 * @param {boolean} [options.dryRun=false] - If true, do not write files
 * @throws {Error} If the source file does not exist or cannot be read
 * @returns {Promise<void>}
 */
export async function convertToJson(sourceFile, targetPath, options = {}) {
  const sheetName = options.sheetName || 'Translations';
  const dryRun = !!options.dryRun;
  try {
    // Check if the source file exists
    await fs.access(sourceFile).catch(() => {
      throw new Error(`Excel file does not exist: ${sourceFile}`);
    });

    // Ensure the target folder exists
    if (!dryRun) {
      await fs.mkdir(targetPath, { recursive: true });
    }

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(sourceFile);
    
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Worksheet "${sheetName}" not found`);
    }

    // Read header row
    const headerRow = worksheet.getRow(1).values;
    // The first element (index 0) is empty or contains "Key"
    const languages = headerRow.slice(2); // Start at 2, since Excel rows start at 1

    // Group translations by language
    const translationsByLanguage = {};
    languages.forEach((lang) => {
      translationsByLanguage[lang] = {};
    });

    // Iterate all rows and extract translations
    worksheet.eachRow((row, rowNumber) => {
      // Skip header
      if (rowNumber === 1) return;
      
      const key = row.getCell(1).value;
      if (!key) return;
      
      languages.forEach((lang, index) => {
        const value = row.getCell(index + 2).value;
        if (value !== undefined && value !== null) {
          // Convert translations to nested object
          setNestedValue(translationsByLanguage[lang], key.split('.'), value);
        }
      });
    });

    // Write JSON files for each language (except in dry-run)
    for (const lang of languages) {
      const filePath = path.join(targetPath, `${lang}.json`);
      if (!dryRun) {
        await fs.writeFile(
          filePath,
          JSON.stringify(translationsByLanguage[lang], null, 2),
          'utf8'
        );
      }
    }
  } catch (error) {
    throw new Error(`Error converting to JSON: ${error.message}`);
  }
}

/**
 * Flattens a nested translation object into a flat structure
 *
 * @param {Object} obj - The object to flatten
 * @param {string} prefix - Prefix for the current key
 * @param {Function} callback - Callback function called for each key-value pair
 * @returns {void}
 */
function flattenTranslations(obj, prefix, callback) {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      flattenTranslations(value, newKey, callback);
    } else {
      callback(newKey, value);
    }
  }
}

/**
 * Sets a nested value in an object based on a key path
 *
 * @param {Object} obj - Target object
 * @param {Array<string>} path - Array of keys defining the path
 * @param {*} value - The value to set
 * @returns {void}
 */
function setNestedValue(obj, path, value) {
  if (path.length === 1) {
    obj[path[0]] = value;
    return;
  }

  const key = path[0];
  if (!obj[key] || typeof obj[key] !== 'object') {
    obj[key] = {};
  }
  
  setNestedValue(obj[key], path.slice(1), value);
}

/**
 * Extracts placeholders like {name} or {{count}} from a string.
 * @param {string} text
 * @returns {Set<string>} Set of placeholders
 */
function extractPlaceholders(text) {
  const placeholders = new Set();
  if (typeof text !== 'string') return placeholders;
  // Supports {name}, {{name}}, { count }, etc.
  const regex = /{{?\s*[\w.]+\s*}}?/g;
  let match;
  while ((match = regex.exec(text))) {
    // Placeholder without curly braces and whitespace
    placeholders.add(match[0].replace(/^{+|}+$/g, '').trim());
  }
  return placeholders;
}

/**
 * Creates a report about missing, duplicate translations and inconsistent placeholders.
 * @param {Map<string, Object>} translations - Map from key to language object
 * @param {string[]} languages - List of language codes
 * @returns {Object} Report object
 */
export function generateTranslationReport(translations, languages) {
  const missing = [];
  const duplicates = [];
  const placeholderInconsistencies = [];
  const seen = new Map();

  for (const [key, langValues] of translations.entries()) {
    // Missing translations
    for (const lang of languages) {
      if (!Object.prototype.hasOwnProperty.call(langValues, lang) || langValues[lang] === '') {
        missing.push({ key, lang });
      }
    }
    // Duplicate keys (should not occur in Map, but for safety)
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.set(key, true);
    }
    // Check placeholder consistency
    const placeholderMap = {};
    for (const lang of languages) {
      const val = langValues[lang];
      placeholderMap[lang] = extractPlaceholders(val || '');
    }
    // Compare: Are there differences?
    const allSets = Object.values(placeholderMap).map(set => Array.from(set).sort().join('|'));
    const uniqueSets = new Set(allSets);
    if (uniqueSets.size > 1) {
      placeholderInconsistencies.push({
        key,
        placeholders: placeholderMap
      });
    }
  }
  return { missing, duplicates, placeholderInconsistencies };
}

/**
 * Prints a report about missing, duplicate translations and placeholder inconsistencies to the console.
 * @param {Object} report - The report object from generateTranslationReport
 */
export function printTranslationReport(report) {
  if (
    report.missing.length === 0 &&
    report.duplicates.length === 0 &&
    (!report.placeholderInconsistencies || report.placeholderInconsistencies.length === 0)
  ) {
    console.log('✅ No missing, duplicate translations or placeholder issues found.');
    return;
  }
  if (report.missing.length > 0) {
    console.log('⚠️ Missing translations:');
    for (const entry of report.missing) {
      console.log(`  - ${entry.key} (${entry.lang})`);
    }
  }
  if (report.duplicates.length > 0) {
    console.log('⚠️ Duplicate keys:');
    for (const key of report.duplicates) {
      console.log(`  - ${key}`);
    }
  }
  if (report.placeholderInconsistencies && report.placeholderInconsistencies.length > 0) {
    console.log('⚠️ Inconsistent placeholders between languages:');
    for (const entry of report.placeholderInconsistencies) {
      console.log(`  - ${entry.key}:`);
      for (const [lang, placeholders] of Object.entries(entry.placeholders)) {
        console.log(`      [${lang}]: {${Array.from(placeholders).join(', ')}}`);
      }
    }
  }
}