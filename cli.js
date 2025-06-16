#!/usr/bin/env node

/**
 * CLI-Einstiegspunkt für i18n-to-excel
 * Bietet ein interaktives Menü zur Konvertierung von i18n-Dateien und Excel-Dateien
 * 
 * @module cli
 */

import chalk from 'chalk';
import figlet from 'figlet';
import { program } from 'commander';
import inquirer from 'inquirer';
import { convertToExcel, convertToJson } from './src/main.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Package-Informationen laden
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

/**
 * Zeigt den Header der Anwendung an
 */
function displayHeader() {
  console.log(
    chalk.cyan(
      figlet.textSync('i18n-to-excel', { horizontalLayout: 'full' })
    )
  );
  console.log(chalk.white(`v${packageJson.version}`));
  console.log(chalk.white('Konvertiere i18n-Dateien zu Excel und zurück\n'));
}

/**
 * Zeigt das Hauptmenü an und verarbeitet die Auswahl
 */
async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Wähle eine Aktion:',
      choices: [
        { name: 'i18n-Dateien zu Excel konvertieren', value: 'toExcel' },
        { name: 'Excel zu i18n-Dateien konvertieren', value: 'toJson' },
        { name: 'Beenden', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'toExcel':
      await handleToExcel();
      break;
    case 'toJson':
      await handleToJson();
      break;
    case 'exit':
      console.log(chalk.green('Auf Wiedersehen!'));
      process.exit(0);
      break;
  }
}

/**
 * Behandelt die Konvertierung von i18n-Dateien zu Excel
 */
async function handleToExcel() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Pfad zu den i18n-Dateien:',
      default: './locales'
    },
    {
      type: 'input',
      name: 'targetFile',
      message: 'Ziel-Excel-Datei:',
      default: './translations.xlsx'
    }
  ]);

  try {
    await convertToExcel(answers.sourcePath, answers.targetFile);
    console.log(chalk.green(`✅ Konvertierung abgeschlossen: ${answers.targetFile}`));
  } catch (error) {
    console.error(chalk.red(`❌ Fehler: ${error.message}`));
  }
  
  await askForAnotherAction();
}

/**
 * Behandelt die Konvertierung von Excel zu i18n-Dateien
 */
async function handleToJson() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourceFile',
      message: 'Pfad zur Excel-Datei:',
      default: './translations.xlsx'
    },
    {
      type: 'input',
      name: 'targetPath',
      message: 'Zielordner für i18n-Dateien:',
      default: './locales'
    }
  ]);

  try {
    await convertToJson(answers.sourceFile, answers.targetPath);
    console.log(chalk.green(`✅ Konvertierung abgeschlossen: ${answers.targetPath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Fehler: ${error.message}`));
  }

  await askForAnotherAction();
}

/**
 * Fragt den Benutzer, ob eine weitere Aktion durchgeführt werden soll
 */
async function askForAnotherAction() {
  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: 'Möchtest du eine weitere Aktion durchführen?',
      default: true
    }
  ]);

  if (again) {
    await showMainMenu();
  } else {
    console.log(chalk.green('Auf Wiedersehen!'));
    process.exit(0);
  }
}

/**
 * Kommandozeilenargumente konfigurieren
 */
program
  .version(packageJson.version)
  .description('Tool zur Konvertierung von i18n-Dateien zu Excel und zurück')
  .option('-t, --to-excel <sourcePath> <targetFile>', 'Konvertiere i18n-Dateien zu Excel')
  .option('-f, --from-excel <sourceFile> <targetPath>', 'Konvertiere Excel zu i18n-Dateien')
  .parse(process.argv);

const options = program.opts();

// Haupteinstiegspunkt
async function main() {
  displayHeader();
  
  // Wenn Kommandozeilenargumente angegeben wurden, direkt ausführen
  if (options.toExcel) {
    const [sourcePath, targetFile] = options.toExcel.split(' ');
    await convertToExcel(sourcePath, targetFile);
  } else if (options.fromExcel) {
    const [sourceFile, targetPath] = options.fromExcel.split(' ');
    await convertToJson(sourceFile, targetPath);
  } else {
    // Ansonsten interaktives Menü anzeigen
    await showMainMenu();
  }
}

// Fehlerbehandlung für unerwartete Fehler
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`Unerwarteter Fehler: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red(`Fehler beim Ausführen: ${error.message}`));
  process.exit(1);
});
