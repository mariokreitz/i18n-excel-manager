/**
 * Tests for the i18n-to-excel module
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertToExcel, convertToJson, generateTranslationReport } from '../src/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_LOCALES_DIR = path.join(__dirname, 'test-locales');
const TEST_EXCEL_FILE = path.join(__dirname, 'test-translations.xlsx');

describe('i18n-to-excel',  () => {
  // Setup before tests
  before(async () => {
    // Create test directories
    await fs.mkdir(TEST_LOCALES_DIR, { recursive: true });
    
    // Create test i18n files
    const deData = {
      common: {
        yes: 'Ja',
        no: 'Nein'
      },
      test: {
        title: 'Test Titel',
        description: 'Beschreibung'
      }
    };
    
    const enData = {
      common: {
        yes: 'Yes',
        no: 'No'
      },
      test: {
        title: 'Test Title',
        description: 'Description'
      }
    };
    
    await fs.writeFile(
      path.join(TEST_LOCALES_DIR, 'de.json'),
      JSON.stringify(deData, null, 2),
      'utf8'
    );
    
    await fs.writeFile(
      path.join(TEST_LOCALES_DIR, 'en.json'),
      JSON.stringify(enData, null, 2),
      'utf8'
    );
  });
  
  // Cleanup after tests
  after(async () => {
    try {
      await fs.rm(TEST_LOCALES_DIR, { recursive: true, force: true });
      await fs.unlink(TEST_EXCEL_FILE);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should convert i18n files to Excel', async () => {
    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE);
    
    // Check if the Excel file exists
    const stats = await fs.stat(TEST_EXCEL_FILE);
    assert.ok(stats.isFile(), 'Excel file was not created');
    assert.ok(stats.size > 0, 'Excel file is empty');
  });
  
  it('should convert Excel back to i18n files', async () => {
    const outputDir = path.join(TEST_LOCALES_DIR, 'output');
    await convertToJson(TEST_EXCEL_FILE, outputDir);
    
    // Check if the i18n files exist
    const files = await fs.readdir(outputDir);
    assert.ok(files.includes('de.json'), 'de.json was not created');
    assert.ok(files.includes('en.json'), 'en.json was not created');

    // Check contents
    const deContent = JSON.parse(
      await fs.readFile(path.join(outputDir, 'de.json'), 'utf8')
    );
    
    assert.strictEqual(deContent.common.yes, 'Ja');
    assert.strictEqual(deContent.test.description, 'Beschreibung');
  });
  
  it('should handle errors for non-existent paths', async () => {
    try {
      await convertToExcel('./non-existent-path', TEST_EXCEL_FILE);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error.message.includes('does not exist'));
    }
  });
  
  it('should generate a report for missing translations in dry-run', async () => {
    // Manipulate a file to remove a translation
    const dePath = path.join(TEST_LOCALES_DIR, 'de.json');
    const deContent = JSON.parse(await fs.readFile(dePath, 'utf8'));
    delete deContent.test.description;
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');

    // Capture console output
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE, { dryRun: true });

    // Restore
    console.log = origLog;

    // There should be a hint about missing translations
    assert.match(output, /Missing translations/);
    assert.match(output, /test\.description \(de\)/);

    // Undo for further tests
    deContent.test.description = 'Beschreibung';
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
  });
  
  it('should report inconsistent placeholders between languages in dry-run', async () => {
    // Manipulate a file to remove a placeholder
    const dePath = path.join(TEST_LOCALES_DIR, 'de.json');
    const deContent = JSON.parse(await fs.readFile(dePath, 'utf8'));
    deContent.test.description = 'Hallo {name}, du hast {count} Nachrichten.';
    const enPath = path.join(TEST_LOCALES_DIR, 'en.json');
    const enContent = JSON.parse(await fs.readFile(enPath, 'utf8'));
    enContent.test.description = 'Hello {name}, you have messages.'; // {count} missing
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
    await fs.writeFile(enPath, JSON.stringify(enContent, null, 2), 'utf8');

    // Capture console output
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE, { dryRun: true });

    // Restore
    console.log = origLog;

    // There should be a hint about placeholder inconsistencies
    assert.match(output, /Inconsistent placeholders/);
    assert.match(output, /test\.description/);
    assert.match(output, /\[de\]: \{name, count\}/);
    assert.match(output, /\[en\]: \{name\}/);

    // Undo for further tests
    deContent.test.description = 'Beschreibung';
    enContent.test.description = 'Description';
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
    await fs.writeFile(enPath, JSON.stringify(enContent, null, 2), 'utf8');
  });
  
  it('should generate a correct translation report', async () => {
    // Simulate translations map with inconsistencies
    const translations = new Map();
    translations.set('greet', { de: 'Hallo {name}', en: 'Hello {name}' });
    translations.set('bye', { de: 'Tschüss', en: '' }); // Missing translation in en
    translations.set('count', { de: 'Du hast {count} Nachrichten.', en: 'You have messages.' }); // Placeholder missing in en
    // Simulate duplicate (Map can't have real duplicates, but we test the logic)
    translations.set('dup', { de: 'A', en: 'A' });
    translations.set('dup', { de: 'B', en: 'B' }); // Overwritten

    const languages = ['de', 'en'];
    const report = generateTranslationReport(translations, languages);

    // Missing translation
    assert.ok(report.missing.some(e => e.key === 'bye' && e.lang === 'en'), 'Missing translation not detected');
    // No real duplicates, as Map overwrites, but logic remains
    assert.ok(Array.isArray(report.duplicates), 'duplicates is not an array');
    // Placeholder inconsistency
    const ph = report.placeholderInconsistencies.find(e => e.key === 'count');
    assert.ok(ph, 'Placeholder inconsistency not detected');
    assert.deepEqual(Array.from(ph.placeholders.de), ['count']);
    assert.deepEqual(Array.from(ph.placeholders.en), []);
  });
});