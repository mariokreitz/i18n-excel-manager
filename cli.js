#!/usr/bin/env node

/**
 * CLI entry point for i18n-excel-manager
 * Provides an interactive menu for converting i18n files and Excel files
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

// Load package information
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

/**
 * Displays the application header
 */
function displayHeader() {
  console.log(
    chalk.cyan(
      figlet.textSync('i18n-excel-manager', { horizontalLayout: 'full' })
    )
  );
  console.log(chalk.white(`v${packageJson.version}`));
  console.log(chalk.white('Convert i18n files to Excel and back\n'));
}

/**
 * Shows the main menu and processes the selection
 */
async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose an action:',
      choices: [
        { name: 'Convert i18n files to Excel', value: 'toExcel' },
        { name: 'Convert Excel to i18n files', value: 'toJson' },
        { name: 'Exit', value: 'exit' }
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
      console.log(chalk.green('Goodbye!'));
      process.exit(0);
      break;
  }
}

/**
 * Handles conversion from i18n files to Excel
 */
async function handleToExcel() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Path to i18n files:',
      default: 'src/public/assets/i18n'
    },
    {
      type: 'input',
      name: 'targetFile',
      message: 'Target Excel file:',
      default: './translations.xlsx'
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: 'Translations'
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write file)?',
      default: false
    }
  ]);

  try {
    await convertToExcel(
      answers.sourcePath,
      answers.targetFile,
      { sheetName: answers.sheetName, dryRun: answers.dryRun }
    );
    if (answers.dryRun) {
      console.log(chalk.yellow('🔎 Dry-run: No file was written.'));
    } else {
      console.log(chalk.green(`✅ Conversion completed: ${answers.targetFile}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }
  
  await askForAnotherAction();
}

/**
 * Handles conversion from Excel to i18n files
 */
async function handleToJson() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'sourceFile',
      message: 'Path to Excel file:',
      default: './translations.xlsx'
    },
    {
      type: 'input',
      name: 'targetPath',
      message: 'Target folder for i18n files:',
      default: './locales'
    },
    {
      type: 'input',
      name: 'sheetName',
      message: 'Excel sheet name:',
      default: 'Translations'
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run (simulate only, do not write files)?',
      default: false
    }
  ]);

  try {
    await convertToJson(
      answers.sourceFile,
      answers.targetPath,
      { sheetName: answers.sheetName, dryRun: answers.dryRun }
    );
    if (answers.dryRun) {
      console.log(chalk.yellow('🔎 Dry-run: No files were written.'));
    } else {
      console.log(chalk.green(`✅ Conversion completed: ${answers.targetPath}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }

  await askForAnotherAction();
}

/**
 * Asks the user if they want to perform another action
 */
async function askForAnotherAction() {
  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: 'Do you want to perform another action?',
      default: true
    }
  ]);

  if (again) {
    await showMainMenu();
  } else {
    console.log(chalk.green('Goodbye!'));
    process.exit(0);
  }
}

/**
 * Configure command line arguments
 */
program
  .version(packageJson.version)
  .description('Tool for converting i18n files to Excel and back')
  .option('-t, --to-excel <sourcePath> <targetFile>', 'Convert i18n files to Excel')
  .option('-f, --from-excel <sourceFile> <targetPath>', 'Convert Excel to i18n files')
  .option('--sheet-name <name>', 'Excel sheet name', 'Translations')
  .option('--dry-run', 'Simulate only, do not write files', false)
  .parse(process.argv);

const options = program.opts();

// Main entry point
async function main() {
  displayHeader();
  
  // If command line arguments are provided, execute directly
  if (options.toExcel) {
    const [sourcePath, targetFile] = options.toExcel.split(' ');
    await convertToExcel(
      sourcePath,
      targetFile,
      { sheetName: options.sheetName, dryRun: options.dryRun }
    );
    if (options.dryRun) {
      console.log(chalk.yellow('🔎 Dry-run: No file was written.'));
    } else {
      console.log(chalk.green(`✅ Conversion completed: ${targetFile}`));
    }
  } else if (options.fromExcel) {
    const [sourceFile, targetPath] = options.fromExcel.split(' ');
    await convertToJson(
      sourceFile,
      targetPath,
      { sheetName: options.sheetName, dryRun: options.dryRun }
    );
    if (options.dryRun) {
      console.log(chalk.yellow('🔎 Dry-run: No files were written.'));
    } else {
      console.log(chalk.green(`✅ Conversion completed: ${targetPath}`));
    }
  } else {
    // Otherwise show interactive menu
    await showMainMenu();
  }
}

// Error handling for unexpected errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`Unexpected error: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red(`Error during execution: ${error.message}`));
  process.exit(1);
});