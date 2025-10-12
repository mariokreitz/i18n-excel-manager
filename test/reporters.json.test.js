import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { jsonFileReporter } from '../src/reporters/json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(__dirname, 'tmp-reporters');

let origWarn;
let warns;

describe('reporters/json', () => {
  beforeEach(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TMP_DIR, { recursive: true });
    origWarn = console.warn;
    warns = [];
    // ...existing code...
    console.warn = (...args) => warns.push(args.join(' '));
  });
  afterEach(async () => {
    // ...existing code...
    console.warn = origWarn;
    await fs.rm(TMP_DIR, { recursive: true, force: true });
  });

  it('writes report to JSON file', async () => {
    const file = path.join(TMP_DIR, 'report.json');
    const reporter = jsonFileReporter(file);
    const report = {
      missing: [{ key: 'a', lang: 'en' }],
      duplicates: ['x'],
      placeholderInconsistencies: [],
    };
    await reporter.print(report);
    const content = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(content);
    assert.deepEqual(parsed, report);
  });

  it('warn delegates to console.warn', () => {
    const reporter = jsonFileReporter('/dev/null');
    reporter.warn('note');
    assert.equal(warns.includes('note'), true);
  });
});
