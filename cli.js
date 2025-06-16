#!/usr/bin/env node

/**
 * @fileoverview Kommandozeilenschnittstelle für das i18n-to-excel Tool.
 * Bietet ein interaktives Menü zur Konvertierung von i18n JSON-Dateien in Excel-Format.
 * @author Mario Kreitz
 * @version 1.0.0
 */

import main from './src/main.js';
import readline from 'readline';

/**
 * ANSI-Farbcodes für die Konsolenformatierung.
 * @constant {Object}
 */
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m"
};

/**
 * Gibt das Anwendungslogo in der Konsole aus.
 * @function
 * @returns {void}
 */
function printLogo() {
  console.log(colors.cyan + `
╔══════════════════════════════════════╗
║         i18n-to-excel CLI           ║
╚══════════════════════════════════════╝
` + colors.reset);
}

/**
 * Gibt das Hauptmenü in der Konsole aus.
 * @function
 * @returns {void}
 */
function printMenu() {
  console.log(colors.yellow + "Was möchtest du tun?\n" + colors.reset +
    "  1) Export starten\n" +
    "  2) Hilfe anzeigen\n" +
    "  3) Beenden\n"
  );
}

/**
 * Gibt die Hilfe- und Nutzungshinweise in der Konsole aus.
 * @function
 * @returns {void}
 */
function printHelp() {
  console.log(colors.magenta + `
i18n-to-excel CLI – Hilfe

Dieses Tool exportiert Übersetzungsdateien (JSON) in eine Excel-Datei.

Bedienung:
  1) Export starten – startet den Exportprozess.
  2) Hilfe anzeigen – zeigt diese Hilfe.
  3) Beenden – beendet das Programm.

Du kannst beim Export folgende Argumente angeben:
  [Eingabeordner] [Ausgabedatei] [Konfigurationsdatei]

Konfiguration:
  Die Datei config.json enthält die unterstützten Sprachen und deren Anzeigenamen.

Beispiel:
  i18n-to-excel ./locales output.xlsx ./config.json

Drücke [Enter], um zum Menü zurückzukehren.
` + colors.reset);
}

/**
 * Stellt eine Frage über die Konsole und gibt die Antwort zurück.
 * @function
 * @param {string} question - Die Frage, die dem Benutzer gestellt wird
 * @returns {Promise<string>} Die Antwort des Benutzers
 */
function ask(question) {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout,
    terminal: true
  });
  
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

/**
 * Startet und verwaltet das interaktive Menü der Anwendung.
 * Verarbeitet Benutzereingaben und führt entsprechende Aktionen aus.
 * @async
 * @function
 * @returns {Promise<void>}
 */
async function runMenu() {
  try {
    printLogo();
    
    while (true) {
      printMenu();
      const choice = await ask(colors.cyan + "Deine Auswahl: " + colors.reset);
      
      switch(choice) {
        case "1":
          // Export starten
          await handleExport();
          break;
        case "2":
          // Hilfe anzeigen
          printHelp();
          await ask("");
          break;
        case "3":
          // Programm beenden
          console.log(colors.cyan + "Auf Wiedersehen!" + colors.reset);
          process.exit(0);
          break;
        default:
          console.log(colors.red + "Ungültige Auswahl. Bitte erneut versuchen.\n" + colors.reset);
      }
    }
  } catch (error) {
    console.error(colors.red + "Unerwarteter Fehler: " + error.message + colors.reset);
    process.exit(1);
  }
}

/**
 * Verarbeitet den Exportvorgang mit Benutzerabfragen für Pfade.
 * @async
 * @function
 * @returns {Promise<void>}
 */
async function handleExport() {
  const inputDir = await ask("Pfad zum Übersetzungs-Ordner [./locales]: ") || "./locales";
  const outputFile = await ask("Name der Ausgabedatei [translations.xlsx]: ") || "translations.xlsx";
  const configFile = await ask("Pfad zur Konfigurationsdatei [./config.json]: ") || "./config.json";
  
  try {
    await main([inputDir, outputFile, configFile]);
    console.log(colors.green + "✓ Export erfolgreich abgeschlossen!\n" + colors.reset);
  } catch (err) {
    console.error(colors.red + "Fehler: " + err.message + colors.reset);
  }
  
  await ask("Drücke [Enter], um zum Menü zurückzukehren.");
}

// Anwendungsstart
runMenu().catch(err => {
  console.error(colors.red + "Kritischer Fehler: " + err.message + colors.reset);
  process.exit(1);
});
