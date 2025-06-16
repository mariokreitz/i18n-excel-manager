/**
 * Hauptmodul für i18n-to-excel
 * Enthält die Kernfunktionalität zum Konvertieren zwischen i18n-JSON und Excel-Dateien
 * 
 * @module main
 */

import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

/**
 * Validiert die Struktur eines JSON-Objekts.
 * Es dürfen nur Strings als Werte vorkommen, keine Arrays, keine Funktionen, keine nulls.
 * @param {Object} obj - Das zu prüfende Objekt
 * @param {string} [path=''] - Aktueller Pfad für Fehlermeldungen
 * @throws {Error} Bei ungültiger Struktur
 */
export function validateJsonStructure(obj, path = '') {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error(`Ungültige Struktur an "${path || '<root>'}": Muss ein Objekt sein.`);
  }
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      validateJsonStructure(value, currentPath);
    } else {
      throw new Error(`Ungültiger Wert an "${currentPath}": Nur Strings und verschachtelte Objekte erlaubt, aber gefunden: ${Array.isArray(value) ? 'Array' : typeof value}`);
    }
  }
}

/**
 * Konvertiert i18n-JSON-Dateien in eine Excel-Datei
 * 
 * @async
 * @param {string} sourcePath - Ordnerpfad mit den i18n-JSON-Dateien
 * @param {string} targetFile - Pfad zur Ziel-Excel-Datei
 * @param {Object} [options] - Zusätzliche Optionen
 * @param {string} [options.sheetName='Translations'] - Name des Excel-Sheets
 * @param {boolean} [options.dryRun=false] - Wenn true, keine Datei schreiben
 * @throws {Error} Wenn der Quellpfad nicht existiert oder keine JSON-Dateien enthält
 * @returns {Promise<void>}
 */
export async function convertToExcel(sourcePath, targetFile, options = {}) {
  const sheetName = options.sheetName || 'Translations';
  const dryRun = !!options.dryRun;
  try {
    // Prüfen, ob der Quellpfad existiert
    await fs.access(sourcePath).catch(() => {
      throw new Error(`Quellpfad existiert nicht: ${sourcePath}`);
    });

    // Dateien im Quellverzeichnis lesen
    const files = await fs.readdir(sourcePath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      throw new Error(`Keine JSON-Dateien im Verzeichnis gefunden: ${sourcePath}`);
    }

    // Alle Übersetzungen als Map von Schlüsseln zu Sprachobjekten
    const translations = new Map();
    const languages = [];

    // JSON-Dateien verarbeiten
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

    // Report im Dry-Run-Modus ausgeben
    if (dryRun) {
      const report = generateTranslationReport(translations, languages);
      printTranslationReport(report);
      return;
    }

    // Excel-Arbeitsmappe erstellen
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Header-Zeile hinzufügen
    const headerRow = ['Key', ...languages];
    worksheet.addRow(headerRow);

    // Alle Übersetzungen hinzufügen
    for (const [key, langValues] of translations.entries()) {
      const row = [key];
      for (const lang of languages) {
        row.push(langValues[lang] || '');
      }
      worksheet.addRow(row);
    }

    // Formatierung und Layout verbessern
    worksheet.columns.forEach(column => {
      column.width = 40;
    });
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Excel-Datei speichern (außer im Dry-Run)
    if (!dryRun) {
      await workbook.xlsx.writeFile(targetFile);
    }
  } catch (error) {
    throw new Error(`Fehler bei der Konvertierung zu Excel: ${error.message}`);
  }
}

/**
 * Konvertiert eine Excel-Datei zurück in i18n-JSON-Dateien
 * 
 * @async
 * @param {string} sourceFile - Pfad zur Quell-Excel-Datei
 * @param {string} targetPath - Zielordner für die JSON-Dateien
 * @param {Object} [options] - Zusätzliche Optionen
 * @param {string} [options.sheetName='Translations'] - Name des Excel-Sheets
 * @param {boolean} [options.dryRun=false] - Wenn true, keine Dateien schreiben
 * @throws {Error} Wenn die Quelldatei nicht existiert oder nicht gelesen werden kann
 * @returns {Promise<void>}
 */
export async function convertToJson(sourceFile, targetPath, options = {}) {
  const sheetName = options.sheetName || 'Translations';
  const dryRun = !!options.dryRun;
  try {
    // Prüfen, ob die Quelldatei existiert
    await fs.access(sourceFile).catch(() => {
      throw new Error(`Excel-Datei existiert nicht: ${sourceFile}`);
    });

    // Sicherstellen, dass der Zielordner existiert
    if (!dryRun) {
      await fs.mkdir(targetPath, { recursive: true });
    }

    // Excel-Datei lesen
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(sourceFile);
    
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Das Arbeitsblatt "${sheetName}" wurde nicht gefunden`);
    }

    // Header-Zeile lesen
    const headerRow = worksheet.getRow(1).values;
    // Das erste Element (Index 0) ist leer oder enthält "Key"
    const languages = headerRow.slice(2); // Start bei 2, da Excel-Zeilen bei 1 beginnen
    
    // Übersetzungen nach Sprachen gruppieren
    const translationsByLanguage = {};
    languages.forEach((lang) => {
      translationsByLanguage[lang] = {};
    });

    // Alle Zeilen durchlaufen und Übersetzungen extrahieren
    worksheet.eachRow((row, rowNumber) => {
      // Header überspringen
      if (rowNumber === 1) return;
      
      const key = row.getCell(1).value;
      if (!key) return;
      
      languages.forEach((lang, index) => {
        const value = row.getCell(index + 2).value;
        if (value !== undefined && value !== null) {
          // Übersetzungen in geschachteltes Objekt umwandeln
          setNestedValue(translationsByLanguage[lang], key.split('.'), value);
        }
      });
    });

    // JSON-Dateien für jede Sprache schreiben (außer im Dry-Run)
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
    throw new Error(`Fehler bei der Konvertierung zu JSON: ${error.message}`);
  }
}

/**
 * Wandelt ein geschachteltes Übersetzungsobjekt in eine flache Struktur um
 * 
 * @param {Object} obj - Das zu flachende Objekt
 * @param {string} prefix - Präfix für den aktuellen Schlüssel
 * @param {Function} callback - Callback-Funktion, die für jedes Key-Value-Paar aufgerufen wird
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
 * Setzt einen verschachtelten Wert in einem Objekt basierend auf einem Schlüsselpfad
 * 
 * @param {Object} obj - Zielobjekt
 * @param {Array<string>} path - Array von Schlüsseln, die den Pfad definieren
 * @param {*} value - Der zu setzende Wert
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
 * Extrahiert Platzhalter wie {name} oder {{count}} aus einem String.
 * @param {string} text
 * @returns {Set<string>} Menge der Platzhalter
 */
function extractPlaceholders(text) {
  const placeholders = new Set();
  if (typeof text !== 'string') return placeholders;
  // Unterstützt {name}, {{name}}, { count }, etc.
  const regex = /{{?\s*[\w.]+\s*}}?/g;
  let match;
  while ((match = regex.exec(text))) {
    // Platzhalter ohne geschweifte Klammern und Whitespace
    placeholders.add(match[0].replace(/^{+|}+$/g, '').trim());
  }
  return placeholders;
}

/**
 * Erstellt einen Report über fehlende, doppelte Übersetzungen und inkonsistente Platzhalter.
 * @param {Map<string, Object>} translations - Map von Key zu Sprachobjekt
 * @param {string[]} languages - Liste der Sprachkürzel
 * @returns {Object} Report-Objekt
 */
export function generateTranslationReport(translations, languages) {
  const missing = [];
  const duplicates = [];
  const placeholderInconsistencies = [];
  const seen = new Map();

  for (const [key, langValues] of translations.entries()) {
    // Fehlende Übersetzungen
    for (const lang of languages) {
      if (!Object.prototype.hasOwnProperty.call(langValues, lang) || langValues[lang] === '') {
        missing.push({ key, lang });
      }
    }
    // Doppelte Keys (sollten in Map nicht vorkommen, aber zur Sicherheit)
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.set(key, true);
    }
    // Platzhalter-Konsistenz prüfen
    const placeholderMap = {};
    for (const lang of languages) {
      const val = langValues[lang];
      placeholderMap[lang] = extractPlaceholders(val || '');
    }
    // Vergleich: Gibt es Unterschiede?
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
 * Gibt einen Report über fehlende, doppelte Übersetzungen und Platzhalter-Inkonsistenzen auf der Konsole aus.
 * @param {Object} report - Das Report-Objekt von generateTranslationReport
 */
export function printTranslationReport(report) {
  if (
    report.missing.length === 0 &&
    report.duplicates.length === 0 &&
    (!report.placeholderInconsistencies || report.placeholderInconsistencies.length === 0)
  ) {
    console.log('✅ Keine fehlenden, doppelten Übersetzungen oder Platzhalter-Probleme gefunden.');
    return;
  }
  if (report.missing.length > 0) {
    console.log('⚠️ Fehlende Übersetzungen:');
    for (const entry of report.missing) {
      console.log(`  - ${entry.key} (${entry.lang})`);
    }
  }
  if (report.duplicates.length > 0) {
    console.log('⚠️ Doppelte Keys:');
    for (const key of report.duplicates) {
      console.log(`  - ${key}`);
    }
  }
  if (report.placeholderInconsistencies && report.placeholderInconsistencies.length > 0) {
    console.log('⚠️ Inkonsistente Platzhalter zwischen den Sprachen:');
    for (const entry of report.placeholderInconsistencies) {
      console.log(`  - ${entry.key}:`);
      for (const [lang, placeholders] of Object.entries(entry.placeholders)) {
        console.log(`      [${lang}]: {${Array.from(placeholders).join(', ')}}`);
      }
    }
  }
}