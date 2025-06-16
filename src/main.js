/**
 * @fileoverview Hauptmodul für das i18n-to-excel Tool.
 * Verarbeitet lokalisierte JSON-Dateien und erstellt daraus eine Excel-Tabelle.
 * @author Mario Kreitz
 * @version 1.0.0
 */

import fs from "fs";
import path from "path";
import xlsx from "xlsx";

/**
 * Flacht ein verschachteltes Objekt in eine Key-Value-Map ab.
 * Wandelt hierarchische Strukturen wie { a: { b: "Wert" }} in { "a.b": "Wert" } um.
 * 
 * @function
 * @param {Object} obj - Das zu flachende Objekt
 * @param {string} [prefix=""] - Präfix für den aktuellen Pfad (für rekursive Aufrufe)
 * @param {Object} [result={}] - Akkumulator für das Ergebnis (für rekursive Aufrufe)
 * @returns {Object} Ein flaches Objekt mit Punktnotation als Schlüssel
 */
function flatten(obj, prefix = "", result = {}) {
  // Prüfe, ob das Objekt gültig ist
  if (!obj || typeof obj !== "object") {
    return result;
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (val && typeof val === "object" && !Array.isArray(val)) {
      // Rekursiv verschachtelte Objekte abflachen
      flatten(val, newKey, result);
    } else {
      // Endknoten als key-value Paar speichern
      result[newKey] = val;
    }
  }
  
  return result;
}

/**
 * Hauptfunktion: Liest Übersetzungen ein und exportiert sie als Excel-Datei.
 * 
 * @async
 * @function
 * @param {string[]} args - Kommandozeilenargumente [inputDir, outputFile, configFile]
 * @returns {Promise<void>}
 * @throws {Error} Bei Problemen mit Eingabeverzeichnis, Dateizugriff oder Export
 */
export default async function main(args) {
  // Parameter extrahieren und Standardwerte setzen
  const inputDir = args[0] || "./locales";
  const outputFile = args[1] || "translations.xlsx";
  const configFile = args[2] || "./config.json";

  // Überprüfe Eingabeverzeichnis
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Eingabeverzeichnis "${inputDir}" existiert nicht.`);
  }
  
  if (!fs.lstatSync(inputDir).isDirectory()) {
    throw new Error(`"${inputDir}" ist kein Verzeichnis.`);
  }

  // Konfiguration laden
  let config = { languages: { de: "Deutsch" } };
  
  if (fs.existsSync(configFile)) {
    try {
      const configData = fs.readFileSync(configFile, "utf-8");
      config = JSON.parse(configData);
      
      // Validiere Konfiguration
      if (!config.languages || typeof config.languages !== "object") {
        throw new Error("Ungültiges Konfigurationsformat: 'languages' Objekt fehlt");
      }
    } catch (error) {
      console.warn(`Warnung: Konfigurationsdatei konnte nicht geladen werden: ${error.message}`);
      console.warn("Standardwerte werden verwendet.");
    }
  } else {
    console.warn(`Warnung: Konfigurationsdatei "${configFile}" nicht gefunden. Standardwerte werden verwendet.`);
  }

  const languageNames = config.languages;
  const selectedLanguages = Object.keys(languageNames);

  // Überprüfe, ob Sprachen in der Konfiguration definiert sind
  if (selectedLanguages.length === 0) {
    throw new Error("Keine Sprachen in der Konfiguration definiert.");
  }

  // Alle relevanten JSON-Dateien einlesen
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".json"));
  
  if (files.length === 0) {
    throw new Error(`Keine JSON-Dateien im Verzeichnis "${inputDir}" gefunden.`);
  }

  // Übersetzungen sammeln
  const translations = {};
  const allKeys = new Set();

  for (const file of files) {
    const lang = path.basename(file, ".json");
    
    // Ignoriere Dateien, die nicht in der Sprachkonfiguration sind
    if (!selectedLanguages.includes(lang)) continue;
    
    try {
      const filePath = path.join(inputDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const flat = flatten(content);
      
      translations[lang] = flat;
      Object.keys(flat).forEach(k => allKeys.add(k));
    } catch (error) {
      console.warn(`Warnung: Datei ${file} konnte nicht verarbeitet werden: ${error.message}`);
    }
  }

  // Prüfe, ob Übersetzungsschlüssel gefunden wurden
  if (allKeys.size === 0) {
    throw new Error("Keine Übersetzungsschlüssel in den Dateien gefunden.");
  }

  // Zeilen für Excel erzeugen: Jeder Schlüssel wird eine Zeile mit Übersetzungen pro Sprache
  const rows = Array.from(allKeys)
    .sort()
    .map(key => {
      const row = { Schlüssel: key };
      
      for (const lang of selectedLanguages) {
        const langName = languageNames[lang] || lang;
        row[langName] = translations[lang]?.[key] || "";
      }
      
      return row;
    });

  // Excel-Datei schreiben
  try {
    const worksheet = xlsx.utils.json_to_sheet(rows);
    
    // Optimale Spaltenbreite einstellen
    const maxWidth = Math.max(...rows.map(row => String(row.Schlüssel).length));
    const wscols = [{ wch: Math.min(Math.max(10, maxWidth), 100) }];
    worksheet['!cols'] = wscols;
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Übersetzungen");
    xlsx.writeFile(workbook, outputFile);
    
    console.log(`✅ Excel-Datei "${outputFile}" wurde erfolgreich erstellt.`);
  } catch (error) {
    throw new Error(`Fehler beim Erstellen der Excel-Datei: ${error.message}`);
  }
}
