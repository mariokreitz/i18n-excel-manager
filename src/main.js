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
            throw new Error(
                `Invalid value at "${currentPath}": Only strings and nested objects allowed, but found: ${
                    Array.isArray(value) ? 'Array' : typeof value
                }`,
            );
        }
    }
}

/**
 * Ensures a directory exists
 * @param {string} dirPath - Directory path to check/create
 */
export async function ensureDirectoryExists(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a file exists
 * @param {string} filePath - File path to check
 * @throws {Error} If the file does not exist
 */
export async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
    } catch (error) {
        throw new Error(`File does not exist: ${filePath}`);
    }
}

/**
 * Loads JSON data from a file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
export async function loadJsonFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
}

/**
 * Writes JSON data to a file
 * @param {string} filePath - Path to write to
 * @param {Object} data - Data to write
 */
export async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Flattens a nested translation object into a flat structure
 * @param {Object} obj - The object to flatten
 * @param {string} prefix - Prefix for the current key
 * @param {Function} callback - Callback function called for each key-value pair
 */
export function flattenTranslations(obj, prefix, callback) {
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
 * @param {Object} obj - Target object
 * @param {Array<string>} path - Array of keys defining the path
 * @param {*} value - The value to set
 */
export function setNestedValue(obj, path, value) {
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
 * @param {string} text - Text to extract placeholders from
 * @returns {Set<string>} Set of placeholders
 */
export function extractPlaceholders(text) {
    const placeholders = new Set();
    if (typeof text !== 'string') return placeholders;

    const regex = /{{?\s*([^{}]+?)\s*}}?/g;
    let match;
    while ((match = regex.exec(text))) {
        placeholders.add(match[1].trim());
    }

    return placeholders;
}

// Path safety and language code validation
const LANG_CODE_RE = /^[A-Za-z0-9]{2,3}(?:[-_][A-Za-z0-9]+)*$/;

export function validateLanguageCode(lang) {
    if (typeof lang !== 'string' || !LANG_CODE_RE.test(lang)) {
        throw new Error(`Invalid language code: ${lang}`);
    }
    return lang;
}

export function safeJoinWithin(baseDir, filename) {
    const resolvedBase = path.resolve(baseDir);
    const candidate = path.resolve(path.join(resolvedBase, filename));
    if (!candidate.startsWith(resolvedBase + path.sep)) {
        throw new Error(`Unsafe output path: ${candidate}`);
    }
    return candidate;
}

/**
 * Creates a mapping from language names to language codes
 * @param {Object} languageMap - Map from language code to language name
 * @returns {Object} Map from language name to language code
 */
export function createReverseLanguageMap(languageMap) {
    const reverseMap = {};
    for (const [code, name] of Object.entries(languageMap)) {
        reverseMap[name] = code;
    }
    return reverseMap;
}

/**
 * Creates and formats an Excel worksheet with translations
 * @param {ExcelJS.Workbook} workbook - Excel workbook
 * @param {string} sheetName - Name for the worksheet
 * @param {Map<string, Object>} translations - Map from key to language object
 * @param {string[]} languageCodes - List of language codes
 * @param {Object} languageMap - Map from language code to language name
 * @returns {ExcelJS.Worksheet} The created worksheet
 */
export function createTranslationWorksheet(workbook, sheetName, translations, languageCodes, languageMap) {
    const worksheet = workbook.addWorksheet(sheetName);

    const languageNames = languageCodes.map(code => {
        return languageMap && languageMap[code] ? languageMap[code] : code;
    });

    const headerRow = ['Key', ...languageNames];
    worksheet.addRow(headerRow);

    for (const [key, langValues] of translations.entries()) {
        const row = [key];
        for (const lang of languageCodes) {
            row.push(langValues[lang] || '');
        }
        worksheet.addRow(row);
    }

    worksheet.columns.forEach(column => {
        column.width = 40;
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
    };

    return worksheet;
}

/**
 * Reads translations from an Excel worksheet
 * @param {ExcelJS.Worksheet} worksheet - Excel worksheet to read from
 * @param {Object} [languageMap] - Map from language name to language code
 * @returns {Object} Object containing languages and translations
 */
export function readTranslationsFromWorksheet(worksheet, languageMap = {}) {
    const reverseLanguageMap = createReverseLanguageMap(languageMap);

    const headerRow = worksheet.getRow(1).values;
    const languageNames = headerRow.slice(2); // Start at 2 since Excel rows start at 1

    const languages = languageNames.map(name => {
        if (reverseLanguageMap[name]) {
            return reverseLanguageMap[name]; // Map back to code if exists
        } else {
            return name; // Keep name if no mapping exists
        }
    });

    const translationsByLanguage = {};
    languages.forEach((lang) => {
        translationsByLanguage[lang] = {};
    });

    const duplicates = new Set();
    const seenKeys = new Set();

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const key = row.getCell(1).value;
        if (!key) return;

        const keyStr = String(key);
        if (seenKeys.has(keyStr)) {
            duplicates.add(keyStr);
        } else {
            seenKeys.add(keyStr);
        }

        languages.forEach((lang, index) => {
            const value = row.getCell(index + 2).value;
            if (value !== undefined && value !== null) {
                setNestedValue(translationsByLanguage[lang], keyStr.split('.'), value);
            }
        });
    });

    return { languages, translationsByLanguage, duplicates: Array.from(duplicates) };
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
        for (const lang of languages) {
            if (!Object.prototype.hasOwnProperty.call(langValues, lang) || langValues[lang] === '') {
                missing.push({ key, lang });
            }
        }

        if (seen.has(key)) {
            duplicates.push(key);
        } else {
            seen.set(key, true);
        }

        const placeholderMap = {};
        for (const lang of languages) {
            const val = langValues[lang];
            placeholderMap[lang] = extractPlaceholders(val || '');
        }

        const allPlaceholders = new Set();
        for (const placeholders of Object.values(placeholderMap)) {
            placeholders.forEach(placeholder => allPlaceholders.add(placeholder));
        }

        let hasInconsistency = false;
        for (const lang of languages) {
            const placeholders = placeholderMap[lang];
            for (const placeholder of allPlaceholders) {
                if (!placeholders.has(placeholder)) {
                    hasInconsistency = true;
                    break;
                }
            }
            if (hasInconsistency) break;
        }

        if (hasInconsistency) {
            placeholderInconsistencies.push({
                key,
                placeholders: placeholderMap,
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

/**
 * Converts i18n JSON files to an Excel file
 *
 * @async
 * @param {string} sourcePath - Folder path with the i18n JSON files
 * @param {string} targetFile - Path to the target Excel file
 * @param {Object} [options] - Additional options
 * @param {string} [options.sheetName='Translations'] - Name of the Excel sheet
 * @param {boolean} [options.dryRun=false] - If true, do not write file
 * @param {Object} [options.languageMap] - Map from language code to language name
 * @param {boolean} [options.report=true] - If true, print report during dry run
 * @throws {Error} If the source path does not exist or contains no JSON files
 * @returns {Promise<void>}
 */
export async function convertToExcel(sourcePath, targetFile, options = {}) {
    const sheetName = options.sheetName || 'Translations';
    const dryRun = !!options.dryRun;
    const languageMap = options.languageMap || {};
    const report = options.report !== false; // default to true unless explicitly disabled

    try {
        await checkFileExists(sourcePath);

        const files = await fs.readdir(sourcePath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            throw new Error(`No JSON files found in directory: ${sourcePath}`);
        }

        const translations = new Map();
        const languages = [];

        for (const file of jsonFiles) {
            const language = path.basename(file, '.json');
            languages.push(language);

            const jsonData = await loadJsonFile(path.join(sourcePath, file));
            validateJsonStructure(jsonData);

            flattenTranslations(jsonData, '', (key, value) => {
                if (!translations.has(key)) {
                    translations.set(key, {});
                }
                translations.get(key)[language] = value;
            });
        }

        if (dryRun) {
            if (report) {
                const reportData = generateTranslationReport(translations, languages);
                printTranslationReport(reportData);
            }
            return;
        }

        const workbook = new ExcelJS.Workbook();
        createTranslationWorksheet(workbook, sheetName, translations, languages, languageMap);

        if (!dryRun) {
            const targetDir = path.dirname(targetFile);
            await ensureDirectoryExists(targetDir);
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
 * @param {Object} [options.languageMap] - Map from language code to language name
 * @param {boolean} [options.failOnDuplicates] - If true, throw an error on duplicate keys
 * @throws {Error} If the source file does not exist or cannot be read
 * @returns {Promise<void>}
 */
export async function convertToJson(sourceFile, targetPath, options = {}) {
    const sheetName = options.sheetName || 'Translations';
    const dryRun = !!options.dryRun;
    const languageMap = options.languageMap || {};
    const failOnDuplicates = options.failOnDuplicates === true;

    try {
        await checkFileExists(sourceFile);

        if (!dryRun) {
            await ensureDirectoryExists(targetPath);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(sourceFile);

        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`Worksheet "${sheetName}" not found`);
        }

        const { languages, translationsByLanguage, duplicates } = readTranslationsFromWorksheet(worksheet, languageMap);

        if (duplicates && duplicates.length > 0) {
            if (failOnDuplicates) {
                throw new Error(`Duplicate keys detected in Excel: ${duplicates.join(', ')}`);
            }
            console.warn(`⚠️ Duplicate keys detected in Excel: ${duplicates.join(', ')}`);
        }

        if (!dryRun) {
            for (const lang of languages) {
                validateLanguageCode(lang);
                const filePath = safeJoinWithin(targetPath, `${lang}.json`);
                await writeJsonFile(filePath, translationsByLanguage[lang]);
            }
        }
    } catch (error) {
        throw new Error(`Error converting to JSON: ${error.message}`);
    }
}
