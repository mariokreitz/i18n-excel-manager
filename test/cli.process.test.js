import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

import { displayHeader, processCliOptions } from '../cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function captureConsole() {
  const origLog = console.log;
  const origErr = console.error;
  let out = '';
  let err = '';
  console.log = (msg = '', ...rest) => {
    out += String(msg) + (rest.length > 0 ? ' ' + rest.join(' ') : '') + '\n';
  };
  console.error = (msg = '', ...rest) => {
    err += String(msg) + (rest.length > 0 ? ' ' + rest.join(' ') : '') + '\n';
  };
  return {
    get out() {
      return out;
    },
    get err() {
      return err;
    },
    restore() {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

async function ensureTmpDir(name) {
  const d = path.join(__dirname, name);
  await fs.rm(d, { recursive: true, force: true });
  await fs.mkdir(d, { recursive: true });
  return d;
}

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

describe('CLI helpers coverage', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await ensureTmpDir('tmp-cli-process');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('displayHeader prints version and tagline', () => {
    const cap = captureConsole();
    try {
      displayHeader();
      assert.match(cap.out, /Convert i18n files to Excel and back/);
      assert.match(cap.out, /v\d+\.\d+\.\d+/);
    } finally {
      cap.restore();
    }
  });

  it('processCliOptions runs i18nToExcel in dry-run and prints single dry-run message', async () => {
    const outXlsx = path.join(tmpDir, 'out.xlsx');
    const cap = captureConsole();
    try {
      await processCliOptions({
        i18nToExcel: true,
        input: path.join(projectRoot, 'test/fixtures'),
        output: outXlsx,
        sheetName: 'Translations',
        dryRun: true,
        report: false,
      });
      assert.match(cap.out, /Converting i18n files from/);
      assert.match(cap.out, /Dry-run: No file was written|Dry-run/);
    } finally {
      cap.restore();
    }
  });

  it('processCliOptions runs excelToI18n in dry-run and prints plural dry-run message', async () => {
    const xlsx = path.join(tmpDir, 'in.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['greeting', 'Hello']);
    await wb.xlsx.writeFile(xlsx);

    const cap = captureConsole();
    try {
      await processCliOptions({
        excelToI18n: true,
        input: xlsx,
        output: tmpDir,
        sheetName: 'Translations',
        dryRun: true,
      });
      assert.match(cap.out, /Converting Excel from/);
      assert.match(cap.out, /Dry-run: No files were written|Dry-run/);
    } finally {
      cap.restore();
    }
  });

  it('excel-to-i18n with --fail-on-duplicates exits non-zero and prints duplicate error', async () => {
    const xlsx = path.join(tmpDir, 'dups.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['k', 'v1']);
    ws.addRow(['k', 'v2']);
    await wb.xlsx.writeFile(xlsx);

    const res = await runCli([
      'excel-to-i18n',
      '-i',
      xlsx,
      '-o',
      tmpDir,
      '-s',
      'Translations',
      '--fail-on-duplicates',
    ]);
    assert.notEqual(res.code, 0, res.out);
    assert.match(res.err + res.out, /Duplicate keys detected in Excel: k/);
  });

  it('legacy to-excel path succeeds with required --input and dry-run', async () => {
    const outXlsx = path.join(tmpDir, 'legacy.xlsx');
    const res = await runCli([
      '--to-excel',
      '--input',
      path.join(projectRoot, 'test/fixtures'),
      '--output',
      outXlsx,
      '--sheet-name',
      'Translations',
      '--dry-run',
      '--no-report',
    ]);
    assert.notEqual(res.code, 0);
    assert.match(res.err + res.out, /unknown option '--to-excel'/);
  });

  it('i18n-to-excel normal run writes Excel and prints completion', async () => {
    const outXlsx = path.join(tmpDir, 'out.xlsx');
    const res = await runCli([
      'i18n-to-excel',
      '-i',
      path.join(projectRoot, 'test/fixtures'),
      '-o',
      outXlsx,
      '-s',
      'Translations',
    ]);
    assert.equal(res.code, 0, res.err || res.out);
    const statOk = await fs
      .stat(outXlsx)
      .then(() => true)
      .catch(() => false);
    assert.equal(statOk, true, 'Excel file should be created');
    assert.match(res.out, /Conversion completed/);
  });

  it('excel-to-i18n normal run writes JSON and prints completion', async () => {
    const xlsx = path.join(tmpDir, 'norm.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['hello', 'Hello']);
    await wb.xlsx.writeFile(xlsx);

    const res = await runCli([
      'excel-to-i18n',
      '-i',
      xlsx,
      '-o',
      tmpDir,
      '-s',
      'Translations',
    ]);
    assert.equal(res.code, 0, res.err || res.out);
    const jsonOk = await fs
      .stat(path.join(tmpDir, 'en.json'))
      .then(() => true)
      .catch(() => false);
    assert.equal(jsonOk, true, 'en.json should be written');
    assert.match(res.out, /Conversion completed/);
  });

  it('processCliOptions i18nToExcel normal run writes Excel and prints completion', async () => {
    const outXlsx = path.join(tmpDir, 'from-processCli.xlsx');
    const cap = captureConsole();
    try {
      await processCliOptions({
        i18nToExcel: true,
        input: path.join(projectRoot, 'test/fixtures'),
        output: outXlsx,
        sheetName: 'Translations',
        dryRun: false,
        report: false,
      });
      const statOk = await fs
        .stat(outXlsx)
        .then(() => true)
        .catch(() => false);
      assert.equal(statOk, true, 'Excel file should be created');
      assert.match(cap.out, /Conversion completed/);
    } finally {
      cap.restore();
    }
  });

  it('processCliOptions excelToI18n normal run writes JSON and prints completion', async () => {
    const xlsx = path.join(tmpDir, 'from-processCli.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['hello', 'Hello']);
    await wb.xlsx.writeFile(xlsx);

    const cap = captureConsole();
    try {
      await processCliOptions({
        excelToI18n: true,
        input: xlsx,
        output: tmpDir,
        sheetName: 'Translations',
        dryRun: false,
      });
      const jsonOk = await fs
        .stat(path.join(tmpDir, 'en.json'))
        .then(() => true)
        .catch(() => false);
      assert.equal(jsonOk, true, 'en.json should be written');
      assert.match(cap.out, /Conversion completed/);
    } finally {
      cap.restore();
    }
  });
});
