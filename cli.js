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
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'),
);

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const defaultConfig = CONFIG.defaults || {
    sourcePath: 'public/assets/i18n',
    targetFile: 'dist/translations.xlsx',
    targetPath: 'locales',
    sheetName: 'Translations',
};

/**
 * Displays the application header in the console using figlet and chalk.
 * Shows the tool name and version.
 * @returns {void}
 */
function displayHeader() {
    console.log(
        chalk.cyan(
            figlet.textSync('i18n-excel-manager', { horizontalLayout: 'full' }),
        ),
    );
    console.log(chalk.white(`v${packageJson.version}`));
    console.log(chalk.white('Convert i18n files to Excel and back\n'));
}

/**
 * Shows the main interactive menu and processes the user's selection.
 * @async
 * @returns {Promise<void>}
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
                { name: 'Exit', value: 'exit' },
            ],
        },
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
 * Prompts the user for i18n-to-Excel conversion options and starts the process.
 * @async
 * @returns {Promise<void>}
 */
async function handleToExcel() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'sourcePath',
            message: 'Path to i18n files:',
            default: defaultConfig.sourcePath,
        },
        {
            type: 'input',
            name: 'targetFile',
            message: 'Target Excel file:',
            default: defaultConfig.targetFile,
        },
        {
            type: 'input',
            name: 'sheetName',
            message: 'Excel sheet name:',
            default: defaultConfig.sheetName,
        },
        {
            type: 'confirm',
            name: 'dryRun',
            message: 'Dry-run (simulate only, do not write file)?',
            default: false,
        },
    ]);

    await performConversion('toExcel', answers);
}

/**
 * Prompts the user for Excel-to-i18n conversion options and starts the process.
 * @async
 * @returns {Promise<void>}
 */
async function handleToJson() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'sourceFile',
            message: 'Path to Excel file:',
            default: defaultConfig.targetFile,
        },
        {
            type: 'input',
            name: 'targetPath',
            message: 'Target folder for i18n files:',
            default: defaultConfig.targetPath,
        },
        {
            type: 'input',
            name: 'sheetName',
            message: 'Excel sheet name:',
            default: defaultConfig.sheetName,
        },
        {
            type: 'confirm',
            name: 'dryRun',
            message: 'Dry-run (simulate only, do not write files)?',
            default: false,
        },
    ]);

    await performConversion('toJson', answers);
}

/**
 * Performs the actual conversion based on the conversion type and user answers.
 * Handles both directions and prints results to the console.
 *
 * @async
 * @param {'toExcel'|'toJson'} conversionType - The conversion direction.
 * @param {object} answers - User answers from inquirer.
 * @returns {Promise<void>}
 */
async function performConversion(conversionType, answers) {
    try {
        const options = {
            sheetName: answers.sheetName,
            dryRun: answers.dryRun,
            languageMap: CONFIG.languages,
        };

        if (conversionType === 'toExcel') {
            console.log(chalk.blue(`Converting i18n files from ${answers.sourcePath} to ${answers.targetFile}...`));
            await convertToExcel(answers.sourcePath, answers.targetFile, options);
        } else {
            console.log(chalk.blue(`Converting Excel from ${answers.sourceFile} to ${answers.targetPath}...`));
            await convertToJson(answers.sourceFile, answers.targetPath, options);
        }

        if (answers.dryRun) {
            console.log(chalk.yellow('🔎 Dry-run: No files were written.'));
        } else {
            const target = conversionType === 'toExcel' ? answers.targetFile : answers.targetPath;
            console.log(chalk.green(`✅ Conversion completed: ${target}`));
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
    }

    await askForAnotherAction();
}

/**
 * Asks the user if they want to perform another action after a conversion.
 * @async
 * @returns {Promise<void>}
 */
async function askForAnotherAction() {
    const { again } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'again',
            message: 'Do you want to perform another action?',
            default: true,
        },
    ]);

    if (again) {
        await showMainMenu();
    } else {
        console.log(chalk.green('Goodbye!'));
        process.exit(0);
    }
}

/**
 * Processes CLI parameters for non-interactive mode.
 * Handles both i18n-to-excel and excel-to-i18n commands, including legacy options.
 *
 * @async
 * @param {object} options - Commander options object.
 * @param {boolean} [options.i18nToExcel] - If true, run i18n-to-excel mode.
 * @param {boolean} [options.excelToI18n] - If true, run excel-to-i18n mode.
 * @param {string} [options.input] - Input path (i18n directory or Excel file).
 * @param {string} [options.output] - Output path (Excel file or i18n directory).
 * @param {string} [options.sheetName] - Excel sheet name.
 * @param {boolean} [options.dryRun] - If true, simulate only, do not write files.
 * @param {boolean} [options.report] - If false, skip generating translation report.
 * @returns {Promise<void>} Resolves when processing is complete.
 */
async function processCliOptions(options) {
    try {
        options.languageMap = CONFIG.languages;

        if (options.i18nToExcel) {
            const sourcePath = options.input || defaultConfig.sourcePath;
            const targetFile = options.output || defaultConfig.targetFile;

            console.log(chalk.blue(`Converting i18n files from ${sourcePath} to ${targetFile}...`));

            await convertToExcel(
                sourcePath,
                targetFile,
                {
                    sheetName: options.sheetName || defaultConfig.sheetName,
                    dryRun: options.dryRun,
                    languageMap: CONFIG.languages,
                    report: options.report,
                },
            );

            if (options.dryRun) {
                console.log(chalk.yellow('🔎 Dry-run: No file was written.'));
            } else {
                console.log(chalk.green(`✅ Conversion completed: ${targetFile}`));
            }
        }
        // Handle Excel to i18n conversion
        else if (options.excelToI18n) {
            const sourceFile = options.input || defaultConfig.targetFile;
            const targetPath = options.output || defaultConfig.targetPath;

            console.log(chalk.blue(`Converting Excel from ${sourceFile} to ${targetPath}...`));

            await convertToJson(
                sourceFile,
                targetPath,
                {
                    sheetName: options.sheetName || defaultConfig.sheetName,
                    dryRun: options.dryRun,
                    languageMap: CONFIG.languages,
                },
            );

            if (options.dryRun) {
                console.log(chalk.yellow('🔎 Dry-run: No files were written.'));
            } else {
                console.log(chalk.green(`✅ Conversion completed: ${targetPath}`));
            }
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

/**
 * Configure command line arguments
 */
program
    .name('i18n-excel-manager')
    .version(packageJson.version)
    .description('Tool for converting i18n files to Excel and back');

// Command for i18n to Excel
program
    .command('i18n-to-excel')
    .alias('to-excel')
    .description('Convert i18n JSON files to Excel')
    .option('-i, --input <path>', 'path to directory containing i18n JSON files', defaultConfig.sourcePath)
    .option('-o, --output <file>', 'path for the output Excel file', defaultConfig.targetFile)
    .option('-s, --sheet-name <name>', 'name of the Excel worksheet', defaultConfig.sheetName)
    .option('-d, --dry-run', 'simulate only, do not write files')
    .option('--no-report', 'skip generating translation report')
    .action((options) => {
        displayHeader();
        options.i18nToExcel = true;
        processCliOptions(options);
    });

// Command for Excel to i18n
program
    .command('excel-to-i18n')
    .alias('to-json')
    .description('Convert Excel file to i18n JSON files')
    .option('-i, --input <file>', 'path to Excel file', defaultConfig.targetFile)
    .option('-o, --output <path>', 'target directory for i18n JSON files', defaultConfig.targetPath)
    .option('-s, --sheet-name <name>', 'name of the Excel worksheet', defaultConfig.sheetName)
    .option('-d, --dry-run', 'simulate only, do not write files')
    .action((options) => {
        displayHeader();
        options.excelToI18n = true;
        processCliOptions(options);
    });

// Legacy options for backward compatibility
program
    .option('-t, --to-excel', 'convert i18n files to Excel (use i18n-to-excel command instead)')
    .option('-f, --from-excel', 'convert Excel to i18n files (use excel-to-i18n command instead)')
    .option('--input <path>', 'input path (i18n directory or Excel file)')
    .option('--output <path>', 'output path (Excel file or i18n directory)')
    .option('--sheet-name <name>', 'Excel sheet name', defaultConfig.sheetName)
    .option('-d, --dry-run', 'simulate only, do not write files')
    .option('--no-report', 'skip generating translation report')
    .action((options) => {
        // Handle legacy parameters
        if (options.toExcel || options.fromExcel) {
            displayHeader();

            if (!options.input) {
                console.error(chalk.red('Error: --input parameter is required'));
                process.exit(1);
            }

            if (options.toExcel) options.i18nToExcel = true;
            if (options.fromExcel) options.excelToI18n = true;

            processCliOptions(options);
        }
    });

/**
 * Main entry point for the application. Runs the interactive menu or parses CLI args.
 * @async
 * @returns {Promise<void>}
 */
async function main() {
    // If no arguments provided, show interactive menu
    if (process.argv.length <= 2) {
        displayHeader();
        await showMainMenu();
    } else {
        program.parse(process.argv);
    }
}

// Error handling for unexpected errors
process.on('uncaughtException', (error) => {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
});

// Only run main when this file is executed directly (not when imported)
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
    main().catch(error => {
        console.error(chalk.red(`Error during execution: ${error.message}`));
        process.exit(1);
    });
}
