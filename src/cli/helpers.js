/**
 * Helper functions for CLI operations.
 * @module cli/helpers
 */

import fsp from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import { ensureDirectoryExists, writeJsonFile } from '../io/fs.js';

import {
  MSG_INIT_CREATED,
  MSG_INIT_SKIPPED_PREFIX,
  MSG_INIT_WILL_CREATE,
} from './constants.js';

/**
 * Detects whether the default i18n directory contains any JSON files.
 * @param {string} dir - Directory to check.
 * @returns {Promise<{exists:boolean,jsonCount:number,files:string[]}>} Detection result.
 */
export async function detectI18nPresence(dir) {
  const resolved = path.resolve(dir);
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const entries = await fsp.readdir(resolved);
    const files = entries.filter((f) => f.toLowerCase().endsWith('.json'));
    return { exists: true, jsonCount: files.length, files };
  } catch {
    return { exists: false, jsonCount: 0, files: [] };
  }
}

/**
 * Parses a comma-separated string of language codes into an array.
 * @param {string} langs - Comma-separated language codes.
 * @returns {string[]|undefined} Array of unique language codes, or undefined if input is falsy.
 */
export function parseLanguagesArg(langs) {
  if (!langs) return;
  return Array.from(
    new Set(
      String(langs)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );
}

/**
 * Builds starter content for a given language.
 * @param {string} lang - Language code.
 * @returns {object} Starter translation object.
 */
export function buildStarterContentFor(lang) {
  // Minimal example translations; fallback to English for unknown languages
  const samples = {
    en: {
      app: {
        title: 'My App',
        welcome: 'Welcome to your localized app',
      },
    },
    de: {
      app: {
        title: 'Meine App',
        welcome: 'Willkommen in Ihrer lokalisierten App',
      },
    },
    fr: {
      app: {
        title: 'Mon application',
        welcome: 'Bienvenue dans votre application localisée',
      },
    },
  };
  return samples[lang] || samples.en;
}

/**
 * Writes initialization files for the given languages in the target directory.
 * @param {string} targetDir - Target directory path.
 * @param {string[]} languages - Array of language codes.
 * @param {boolean} dryRun - If true, simulate without writing files.
 * @returns {Promise<{created:string[],skipped:string[],dir:string}>} Result of the operation.
 */
export async function writeInitFiles(targetDir, languages, dryRun) {
  const created = [];
  const skipped = [];
  const resolvedDir = path.resolve(targetDir);
  if (!dryRun) {
    await ensureDirectoryExists(resolvedDir);
  }
  for (const lang of languages) {
    const file = path.join(resolvedDir, `${lang}.json`);
    let exists = false;
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fsp.access(file);
      exists = true;
    } catch {
      exists = false;
    }
    if (exists) {
      skipped.push(file);
      console.log(chalk.yellow(`${MSG_INIT_SKIPPED_PREFIX}${file}`));
      continue;
    }
    const content = buildStarterContentFor(lang);
    if (dryRun) {
      console.log(chalk.blue(`${MSG_INIT_WILL_CREATE}${file}`));
    } else {
      await writeJsonFile(file, content);
      console.log(chalk.green(`${MSG_INIT_CREATED}${file}`));
    }
    created.push(file);
  }
  return { created, skipped, dir: resolvedDir };
}

/**
 * Computes whether dry-run mode is enabled based on options and process args.
 * @param {object} options - Options object.
 * @param {boolean} [options.dryRun] - Dry-run flag.
 * @returns {boolean} True if dry-run is enabled.
 */
export function computeIsDryRun(options) {
  return (
    options.dryRun === true ||
    process.argv.includes('-d') ||
    process.argv.includes('--dry-run')
  );
}
