/**
 * @module cli/helpers
 * Support utilities for CLI operations (presence detection, parsing, initialization).
 */

import fsp from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import { assertNonEmptyString } from '../core/validation.js';
import { ensureDirectoryExists, writeJsonFile } from '../io/fs.js';

import {
  MSG_INIT_CREATED,
  MSG_INIT_SKIPPED_PREFIX,
  MSG_INIT_WILL_CREATE,
} from './constants.js';

/**
 * Detect whether directory contains JSON translation files.
 * @param {string} dir Directory path.
 * @returns {Promise<{exists:boolean,jsonCount:number,files:string[]}>} Detection result.
 */
export async function detectI18nPresence(dir) {
  assertNonEmptyString(dir, 'i18n directory');
  const resolved = path.resolve(dir);
  try {
    const entries = await fsp.readdir(resolved);
    const files = entries.filter((f) => f.toLowerCase().endsWith('.json'));
    return { exists: true, jsonCount: files.length, files };
  } catch {
    return { exists: false, jsonCount: 0, files: [] };
  }
}

/**
 * Parse comma-separated language codes.
 * @param {string} langs Comma separated list.
 * @returns {string[]|undefined} Unique trimmed codes or undefined.
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
 * Build starter content for a language.
 * @param {string} lang Language code.
 * @returns {Object} Starter translation object.
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
 * Write language initialization files (or simulate if dryRun).
 * @param {string} targetDir Target directory path.
 * @param {string[]} languages Language codes.
 * @param {boolean} dryRun Dry-run mode.
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
 * Compute dry-run flag from options and process argv.
 * @param {Object} options Options object.
 * @returns {boolean} True if dry-run.
 */
export function computeIsDryRun(options) {
  return (
    options.dryRun === true ||
    process.argv.includes('-d') ||
    process.argv.includes('--dry-run')
  );
}
