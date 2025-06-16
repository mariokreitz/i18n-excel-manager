/**
 * Tests für das i18n-to-excel Modul
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

describe('i18n-to-excel', async () => {
  // Vor den Tests Setup erstellen
  before(async () => {
    // Test-Verzeichnisse erstellen
    await fs.mkdir(TEST_LOCALES_DIR, { recursive: true });
    
    // Test-i18n-Dateien erstellen
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
  
  // Nach den Tests aufräumen
  after(async () => {
    try {
      await fs.rm(TEST_LOCALES_DIR, { recursive: true, force: true });
      await fs.unlink(TEST_EXCEL_FILE);
    } catch (error) {
      // Fehler beim Aufräumen ignorieren
    }
  });
  
  it('should convert i18n files to Excel', async () => {
    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE);
    
    // Prüfen, ob die Excel-Datei existiert
    const stats = await fs.stat(TEST_EXCEL_FILE);
    assert.ok(stats.isFile(), 'Excel-Datei wurde nicht erstellt');
    assert.ok(stats.size > 0, 'Excel-Datei ist leer');
  });
  
  it('should convert Excel back to i18n files', async () => {
    const outputDir = path.join(TEST_LOCALES_DIR, 'output');
    await convertToJson(TEST_EXCEL_FILE, outputDir);
    
    // Prüfen, ob die i18n-Dateien existieren
    const files = await fs.readdir(outputDir);
    assert.ok(files.includes('de.json'), 'de.json wurde nicht erstellt');
    assert.ok(files.includes('en.json'), 'en.json wurde nicht erstellt');
    
    // Inhalte prüfen
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
      assert.ok(error.message.includes('existiert nicht'));
    }
  });
  
  it('should generate a report for missing translations in dry-run', async () => {
    // Manipuliere eine Datei, um eine Übersetzung zu entfernen
    const dePath = path.join(TEST_LOCALES_DIR, 'de.json');
    const deContent = JSON.parse(await fs.readFile(dePath, 'utf8'));
    delete deContent.test.description;
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');

    // Fange die Konsolenausgabe ab
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE, { dryRun: true });

    // Wiederherstellen
    console.log = origLog;

    // Es sollte ein Hinweis auf fehlende Übersetzungen erscheinen
    assert.match(output, /Fehlende Übersetzungen/);
    assert.match(output, /test\.description \(de\)/);

    // Rückgängig machen für weitere Tests
    deContent.test.description = 'Beschreibung';
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
  });
  
  it('should report inconsistent placeholders between languages in dry-run', async () => {
    // Manipuliere eine Datei, um einen Platzhalter zu entfernen
    const dePath = path.join(TEST_LOCALES_DIR, 'de.json');
    const deContent = JSON.parse(await fs.readFile(dePath, 'utf8'));
    deContent.test.description = 'Hallo {name}, du hast {count} Nachrichten.';
    const enPath = path.join(TEST_LOCALES_DIR, 'en.json');
    const enContent = JSON.parse(await fs.readFile(enPath, 'utf8'));
    enContent.test.description = 'Hello {name}, you have messages.'; // {count} fehlt
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
    await fs.writeFile(enPath, JSON.stringify(enContent, null, 2), 'utf8');

    // Fange die Konsolenausgabe ab
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    await convertToExcel(TEST_LOCALES_DIR, TEST_EXCEL_FILE, { dryRun: true });

    // Wiederherstellen
    console.log = origLog;

    // Es sollte ein Hinweis auf Platzhalter-Inkonsistenzen erscheinen
    assert.match(output, /Inkonsistente Platzhalter/);
    assert.match(output, /test\.description/);
    assert.match(output, /\[de\]: \{name, count\}/);
    assert.match(output, /\[en\]: \{name\}/);

    // Rückgängig machen für weitere Tests
    deContent.test.description = 'Beschreibung';
    enContent.test.description = 'Description';
    await fs.writeFile(dePath, JSON.stringify(deContent, null, 2), 'utf8');
    await fs.writeFile(enPath, JSON.stringify(enContent, null, 2), 'utf8');
  });
});