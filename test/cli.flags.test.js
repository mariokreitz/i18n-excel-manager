import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCli(args) {
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      [path.resolve(projectRoot, 'cli.js'), ...args],
      {
        cwd: projectRoot,
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => {
      out += String(d);
    });
    proc.stderr.on('data', (d) => {
      err += String(d);
    });
    proc.on('exit', (code) => resolve({ code, out, err }));
  });
}

describe('CLI flags and commands', () => {
  it('i18n-to-excel dry run with --no-report exits 0 and prints dry-run single', async () => {
    const res = await runCli([
      'i18n-to-excel',
      '-i',
      'test/fixtures',
      '-o',
      'test/tmp/out.xlsx',
      '-s',
      'Translations',
      '-d',
      '--no-report',
    ]);
    assert.equal(res.code, 0, res.err || res.out);
    assert.match(res.out, /Dry-run: No file was written|Dry-run/);
  });

  it('excel-to-i18n dry run exits 0 and prints dry-run plural', async () => {
    const tmpDir = path.join(__dirname, 'tmp-cli');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
    const xlsx = path.join(tmpDir, 'in.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['k', 'v']);
    await wb.xlsx.writeFile(xlsx);

    const res = await runCli([
      'excel-to-i18n',
      '-i',
      xlsx,
      '-o',
      tmpDir,
      '-s',
      'Translations',
      '-d',
    ]);
    assert.equal(res.code, 0, res.err || res.out);
    assert.match(res.out, /Dry-run: No files were written|Dry-run/);
  });

  it('legacy mode errors when --input missing', async () => {
    const res = await runCli(['--to-excel']);
    assert.notEqual(res.code, 0);
    assert.match(res.err + res.out, /--input parameter is required/);
  });
});
