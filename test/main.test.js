/**
 * Tests for the i18n-to-excel module
 *
 * Tests the core functionality of converting between i18n JSON files and Excel,
 * including language mappings and helper functions.
 */

import fs from 'fs/promises';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

import ExcelJS from 'exceljs';

import { extractPlaceholders } from '../src/core/json/placeholders.js';
import {
  flattenTranslations,
  setNestedValue,
  validateJsonStructure,
} from '../src/core/json/structure.js';
import { generateTranslationReport } from '../src/core/report/translationReport.js';
import {
  consoleReporter,
  convertToExcel,
  convertToJson,
} from '../src/index.js';
import {
  checkFileExists,
  ensureDirectoryExists,
  loadJsonFile,
  writeJsonFile,
} from '../src/io/fs.js';

// Import internal helper functions for tests
const mainModule = {
  ensureDirectoryExists,
  checkFileExists,
  loadJsonFile,
  writeJsonFile,
  extractPlaceholders,
  setNestedValue,
  flattenTranslations,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'fixtures');
const tmpDir = path.join(__dirname, 'tmp');
const excelFile = path.join(tmpDir, 'test.xlsx');

// Test language mapping
const languageMap = {
  de: 'German',
  en: 'English',
  fr: 'French',
};

// Common setup and teardown functions
/**
 * Cleans up the temporary directory before or after tests
 */
async function cleanupTmpDir() {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore if directory doesn't exist
  }
}

/**
 * Creates necessary directories for testing
 */
async function setupDirectories() {
  await fs.mkdir(tmpDir, { recursive: true });
}

// Main test suite
describe('i18n-excel-manager tests', async () => {
  // Setup before all tests
  before(async () => {
    await cleanupTmpDir();
    await setupDirectories();
  });

  // Cleanup after all tests
  after(async () => {
    await cleanupTmpDir();
  });

  // Tests for core conversion functionality with language mapping
  describe('Core conversion with language mapping', async () => {
    beforeEach(async () => {
      // Clean temporary directory before each test
      await cleanupTmpDir();
      await setupDirectories();
    });

    it('should convert i18n files to Excel with language names in column headers', async () => {
      // Convert JSON files to Excel
      await convertToExcel(testDir, excelFile, {
        languageMap: languageMap,
      });

      // Verify Excel file creation
      const stats = await fs.stat(excelFile);
      assert.ok(stats.size > 0, 'Excel file should be generated with content');

      // Check language names in column headers
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelFile);
      const worksheet = workbook.getWorksheet('Translations');

      // Check headers (should use language names, not codes)
      const headers = worksheet.getRow(1).values;
      assert.strictEqual(headers[1], 'Key', 'First column should be "Key"');
      assert.strictEqual(
        headers[2],
        'German',
        'Second column should be "German" (not "de")',
      );
      assert.strictEqual(
        headers[3],
        'English',
        'Third column should be "English" (not "en")',
      );
      assert.strictEqual(
        headers[4],
        'French',
        'Fourth column should be "French" (not "fr")',
      );

      // Check if content is correctly included
      const findRow = (key) => {
        let found = null;
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1 && row.getCell(1).value === key) {
            found = row;
          }
        });
        return found;
      };

      const yesRow = findRow('common.yes');
      assert.ok(yesRow, 'Should find "common.yes" row');
      assert.strictEqual(
        yesRow.getCell(2).value,
        'Ja',
        'German translation should be correct',
      );
      assert.strictEqual(
        yesRow.getCell(3).value,
        'Yes',
        'English translation should be correct',
      );
      assert.strictEqual(
        yesRow.getCell(4).value,
        'Oui',
        'French translation should be correct',
      );
    });

    it('should convert Excel back to i18n files with correct language codes', async () => {
      // First create Excel file to convert from
      await convertToExcel(testDir, excelFile, {
        languageMap: languageMap,
      });

      // Create output directory for JSON
      const jsonOutputDir = path.join(tmpDir, 'json-output');
      await fs.mkdir(jsonOutputDir, { recursive: true });

      // Convert Excel back to JSON
      await convertToJson(excelFile, jsonOutputDir, {
        languageMap: languageMap,
      });

      // Check if files were created with language codes (not names)
      for (const lang of ['de', 'en', 'fr']) {
        const filePath = path.join(jsonOutputDir, `${lang}.json`);
        assert.ok(
          await fs
            .stat(filePath)
            .then(() => true)
            .catch(() => false),
          `Should create JSON file for ${lang}`,
        );

        // Check content
        const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
        assert.strictEqual(
          typeof content.common.yes,
          'string',
          `Translation for ${lang}.common.yes should exist`,
        );
      }

      // Check if no files were created with language names as filenames
      for (const langName of Object.values(languageMap)) {
        const filePath = path.join(jsonOutputDir, `${langName}.json`);
        assert.strictEqual(
          await fs
            .stat(filePath)
            .then(() => true)
            .catch(() => false),
          false,
          `Should not create file with language name ${langName}`,
        );
      }
    });

    it('should handle unknown language codes correctly', async () => {
      // Create test data with an unknown language code
      const unknownLang = 'xx';

      // Convert to Excel with language map that doesn't include the unknown code
      await convertToExcel(testDir, excelFile, {
        languageMap: languageMap,
      });

      // Check if Excel contains the unknown language code unchanged
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelFile);
      const worksheet = workbook.getWorksheet('Translations');
      const headerRow = worksheet.getRow(1).values;

      // Find the column index for the unknown language
      const languageIndex = headerRow.findIndex(
        (header) => header === unknownLang,
      );
      assert.ok(
        languageIndex > 0,
        'Unknown language should be included with its code',
      );

      // Convert back to JSON
      const jsonTargetDir = path.join(tmpDir, 'output-unknown');
      await fs.mkdir(jsonTargetDir, { recursive: true });
      await convertToJson(excelFile, jsonTargetDir, {
        languageMap: languageMap,
      });

      // Check if the unknown language file was created correctly
      const filePath = path.join(jsonTargetDir, `${unknownLang}.json`);
      const fileExists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);
      assert.ok(
        fileExists,
        `JSON file for unknown language ${unknownLang} should exist`,
      );
    });
  });

  // Tests for JSON structure validation
  describe('validateJsonStructure', async () => {
    it('rejects primitive values as root', () => {
      assert.throws(() => validateJsonStructure('string'), /Invalid structure/);
      assert.throws(() => validateJsonStructure(123), /Invalid structure/);
      assert.throws(() => validateJsonStructure(true), /Invalid structure/);
    });

    it('accepts empty object as root', () => {
      assert.doesNotThrow(() => validateJsonStructure({}));
    });

    it('accepts complex nested objects with string values', () => {
      const complex = {
        a: 'value',
        b: { c: { d: 'nested' } },
        e: { f: 'another' },
      };
      assert.doesNotThrow(() => validateJsonStructure(complex));
    });

    it('throws with informative path for nested invalid values', () => {
      const obj = {
        valid: 'string',
        nested: {
          invalid: [1, 2, 3],
        },
      };
      try {
        validateJsonStructure(obj);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.match(error.message, /nested\.invalid/);
      }
    });
  });

  // Tests for helper functions
  describe('Utility functions', async () => {
    beforeEach(async () => {
      await fs.mkdir(tmpDir, { recursive: true });
    });

    it('creates directory structure if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'nested', 'directory');

      // Create directory structure
      await mainModule.ensureDirectoryExists(nestedDir);

      // Check if directory exists
      const dirExists = await fs
        .stat(nestedDir)
        .then(() => true)
        .catch(() => false);
      assert.ok(dirExists, 'Directory should be created');
    });

    it('throws when checking a nonexistent file', async () => {
      const nonExistentFile = path.join(tmpDir, 'does-not-exist.json');

      // Test function
      try {
        await mainModule.checkFileExists(nonExistentFile);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.match(error.message, /does not exist/);
      }
    });

    it('extracts placeholders from text correctly', () => {
      // Simple placeholder
      assert.deepStrictEqual(
        Array.from(mainModule.extractPlaceholders('Hello {name}')),
        ['name'],
      );

      // Double curly braces
      assert.deepStrictEqual(
        Array.from(mainModule.extractPlaceholders('Hello {{name}}')),
        ['name'],
      );

      // With spaces
      assert.deepStrictEqual(
        Array.from(mainModule.extractPlaceholders('Hello { name }')),
        ['name'],
      );

      // Multiple placeholders
      assert.deepStrictEqual(
        Array.from(
          mainModule.extractPlaceholders(
            'Hello {name}, you have {count} messages',
          ),
        ).toSorted(),
        ['name', 'count'].toSorted(),
      );
    });

    it('sets nested values correctly', () => {
      const obj = {};
      mainModule.setNestedValue(obj, ['a', 'b', 'c'], 'value');
      assert.deepStrictEqual(obj, { a: { b: { c: 'value' } } });

      // Overwrite existing values
      const obj2 = { x: { y: 'old' } };
      mainModule.setNestedValue(obj2, ['x', 'y'], 'new');
      assert.deepStrictEqual(obj2, { x: { y: 'new' } });
    });

    it('flattens translations correctly', () => {
      const obj = {
        a: {
          b: 'value1',
          c: { d: 'value2' },
        },
        e: 'value3',
      };

      const results = {};
      mainModule.flattenTranslations(obj, '', (key, value) => {
        results[key] = value;
      });

      assert.deepStrictEqual(results, {
        'a.b': 'value1',
        'a.c.d': 'value2',
        e: 'value3',
      });
    });

    it('reads and writes JSON files correctly', async () => {
      const testData = { test: { nested: 'value' } };
      const testPath = path.join(tmpDir, 'test-write.json');

      // Write JSON file
      await mainModule.writeJsonFile(testPath, testData);

      // Read JSON file
      const readData = await mainModule.loadJsonFile(testPath);

      // Compare contents
      assert.deepStrictEqual(
        readData,
        testData,
        'Read data should match written data',
      );
    });

    it('throws helpful error for malformed JSON', async () => {
      const malformedPath = path.join(tmpDir, 'malformed.json');
      await fs.writeFile(malformedPath, '{not valid json', 'utf8');

      try {
        await mainModule.loadJsonFile(malformedPath);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.match(error.message, /Invalid JSON/);
      }
    });
  });

  // Tests for translation report generation
  describe('Translation report generation', async () => {
    it('prints success message when no issues found', () => {
      let output = '';
      const origLog = console.log;
      console.log = (msg) => {
        output += msg + '\n';
      };

      const cleanReport = {
        missing: [],
        duplicates: [],
        placeholderInconsistencies: [],
      };

      consoleReporter.print(cleanReport);
      console.log = origLog;

      assert.match(output, /✅ No missing, duplicate translations/);
    });

    it('detects missing translations', () => {
      const translations = new Map([
        ['key1', { de: 'Wert1' }],
        ['key2', { de: 'Wert2', en: 'Value2' }],
      ]);
      // missing 'en'

      const languages = ['de', 'en'];
      const report = generateTranslationReport(translations, languages);

      assert.strictEqual(
        report.missing.length,
        1,
        'Should detect one missing translation',
      );
      assert.strictEqual(
        report.missing[0].key,
        'key1',
        'Should identify which key is missing',
      );
      assert.strictEqual(
        report.missing[0].lang,
        'en',
        'Should identify which language is missing',
      );
    });

    it('detects inconsistent placeholders', () => {
      const translations = new Map([
        [
          'greeting',
          {
            de: 'Hallo {name}, du hast {count} Nachrichten.',
            en: 'Hello {name}, you have messages.', // missing {count}
          },
        ],
      ]);

      const languages = ['de', 'en'];
      const report = generateTranslationReport(translations, languages);

      assert.strictEqual(
        report.placeholderInconsistencies.length,
        1,
        'Should detect placeholder inconsistency',
      );
    });

    it('detects double curly placeholders with spaces', () => {
      const translations = new Map([
        [
          'key',
          {
            de: 'Hallo {{ userName }}, wie geht es dir?',
            en: 'Hello {{userName}}, how are you?',
          },
        ],
      ]);

      const languages = ['de', 'en'];
      const report = generateTranslationReport(translations, languages);

      // Check if differences in placeholders are detected
      // userName vs userName - the difference is only in spacing
      assert.strictEqual(
        report.placeholderInconsistencies.length,
        0,
        'Should not detect spacing differences in placeholders',
      );

      // Actual differences that should be detected
      translations.set('key2', {
        de: 'Hallo {person}, willkommen!',
        en: 'Hello {user}, welcome!',
      });

      const report2 = generateTranslationReport(translations, languages);
      assert.strictEqual(
        report2.placeholderInconsistencies.length,
        1,
        'Should detect actual different placeholder names',
      );
    });
  });

  // Tests for reverse language mapping
  describe('Reverse language mapping', async () => {
    it('should correctly map language names back to codes', async () => {
      // Create test data
      const jsonOutputDir = path.join(tmpDir, 'lang-name-test');
      await fs.mkdir(jsonOutputDir, { recursive: true });

      // Create test Excel with language names
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Translations'); // Name must be Translations

      // Add headers with language names
      worksheet.addRow(['Key', 'German', 'English', 'French']);

      // Add test translations
      worksheet.addRow(['test.key', 'DE Wert', 'EN Value', 'FR Valeur']);

      // Save Excel file
      const testExcelFile = path.join(tmpDir, 'language-names.xlsx');
      await workbook.xlsx.writeFile(testExcelFile);

      // Convert Excel back to JSON with language mapping
      await convertToJson(testExcelFile, jsonOutputDir, {
        languageMap: languageMap,
      });

      // Check if files were created with language codes
      for (const [code, name] of Object.entries(languageMap)) {
        const filePath = path.join(jsonOutputDir, `${code}.json`);
        const exists = await fs
          .stat(filePath)
          .then(() => true)
          .catch(() => false);
        assert.ok(exists, `Should create file for ${code} from column ${name}`);
      }
    });
  });
});
