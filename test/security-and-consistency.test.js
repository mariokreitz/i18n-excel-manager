import fs from 'fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

import { readTranslationsFromWorksheet } from '../src/core/excel/sheetRead.js';
import { convertToJson } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmpDir = path.join(__dirname, 'tmp-sec');

async function cleanup() {
  await fs.rm(tmpDir, { recursive: true, force: true });
}

async function setup() {
  await fs.mkdir(tmpDir, { recursive: true });
}

describe('Path safety and duplicate detection', () => {
  before(async () => {
    await cleanup();
    await setup();
  });
  after(async () => {
    await cleanup();
  });

  it('rejects invalid language headers and prevents path traversal', async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Translations');
    // Malicious header
    ws.addRow(['Key', '../../evil']);
    ws.addRow(['test.key', 'value']);

    const xlsxPath = path.join(tmpDir, 'malicious.xlsx');
    await workbook.xlsx.writeFile(xlsxPath);

    const outDir = path.join(tmpDir, 'out');
    await fs.mkdir(outDir, { recursive: true });

    let threw = false;
    try {
      await convertToJson(xlsxPath, outDir, {});
    } catch (e) {
      threw = true;
      assert.match(
        String(e.message),
        /Invalid language code|Unsafe output path/,
      );
    }
    assert.equal(
      threw,
      true,
      'convertToJson should reject invalid language header',
    );

    // Ensure no files were written
    const files = await fs.readdir(outDir);
    assert.equal(
      files.length,
      0,
      'no files should be written on invalid input',
    );
  });

  it('detects duplicate keys in Excel worksheet', async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['greet.hello', 'Hello']);
    ws.addRow(['greet.hello', 'Hello again']); // duplicate

    const { duplicates } = readTranslationsFromWorksheet(ws, {});
    assert.ok(Array.isArray(duplicates));
    assert.ok(duplicates.includes('greet.hello'));
  });

  it('fails on duplicates when failOnDuplicates is true (API)', async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['dup.key', 'One']);
    ws.addRow(['dup.key', 'Two']);
    const xlsxPath = path.join(tmpDir, 'dups.xlsx');
    await workbook.xlsx.writeFile(xlsxPath);

    const outDir = path.join(tmpDir, 'out-dups');
    await fs.mkdir(outDir, { recursive: true });

    let threw = false;
    try {
      await convertToJson(xlsxPath, outDir, { failOnDuplicates: true });
    } catch (e) {
      threw = true;
      assert.match(String(e.message), /Duplicate keys detected/);
    }
    assert.equal(
      threw,
      true,
      'convertToJson should throw on duplicates when failOnDuplicates is true',
    );
  });

  it('CLI: --fail-on-duplicates exits non-zero', async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['dup.cli', 'One']);
    ws.addRow(['dup.cli', 'Two']);
    const xlsxPath = path.join(tmpDir, 'dups-cli.xlsx');
    await workbook.xlsx.writeFile(xlsxPath);

    const outDir = path.join(tmpDir, 'out-dups-cli');
    await fs.mkdir(outDir, { recursive: true });

    const proc = spawn(
      process.execPath,
      [
        path.resolve(__dirname, '..', 'cli.js'),
        'excel-to-i18n',
        '-i',
        xlsxPath,
        '-o',
        outDir,
        '--fail-on-duplicates',
      ],
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let out = '';
    let err = '';
    const { code } = await new Promise((resolve) => {
      proc.stdout.on('data', (d) => {
        out += String(d);
      });
      proc.stderr.on('data', (d) => {
        err += String(d);
      });
      proc.on('exit', (code) => resolve({ code }));
    });
    assert.notEqual(
      code,
      0,
      'CLI should exit non-zero on duplicates with --fail-on-duplicates',
    );
    assert.match(err + out, /Duplicate keys detected/);
  });
});
