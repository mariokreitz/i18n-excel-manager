import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

import { runAnalyze } from '../src/cli/commands/index.js';
import { writeInitFiles } from '../src/cli/helpers.js';

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
    assert.match(res.err + res.out, /unknown option '--to-excel'/);
  });

  it('analyze --json-report keeps stdout machine-readable without header noise', async () => {
    const tmpDir = path.join(projectRoot, '.tmp-cli-json');
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.mkdir(tmpDir, { recursive: true });
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'fixture-source.ts'),
        "'app.title' | translate",
        'utf8',
      );

      const res = await runCli([
        'analyze',
        '--input',
        'test/fixtures',
        '--pattern',
        path.join(srcDir, '**/*.ts'),
        '--json-report',
      ]);

      assert.equal(res.code, 0, res.err || res.out);
      const parsed = JSON.parse(res.out.trim());
      assert.ok('totalCodeKeys' in parsed);
      assert.doesNotMatch(res.out, /Convert i18n files to Excel and back/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('quiet mode suppresses non-error output for conversion commands', async () => {
    const res = await runCli([
      'i18n-to-excel',
      '-i',
      'test/fixtures',
      '-o',
      'test/tmp/out-quiet.xlsx',
      '-s',
      'Translations',
      '-d',
      '--no-report',
      '--quiet',
    ]);

    assert.equal(res.code, 0, res.err || res.out);
    assert.equal(res.out.trim(), '');
  });

  it('translate --format json sends failures to stderr without stdout banner noise', async () => {
    const res = await runCli([
      'translate',
      '--input',
      'test/tmp-interactive.xlsx',
      '--format',
      'json',
    ]);

    assert.notEqual(res.code, 0);
    assert.equal(res.out.trim(), '');
    assert.match(res.err, /API Key is missing/);
  });
});

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

describe('analyze --json-report', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(__dirname, 'tmp-flags-f2');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('outputs parseable JSON when jsonReport is true', async () => {
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'test.ts'),
      "'app.title' | translate",
      'utf8',
    );

    const cap = captureConsole();
    try {
      await runAnalyze({
        input: 'test/fixtures',
        pattern: path.join(srcDir, '**/*.ts'),
        jsonReport: true,
      });
      const parsed = JSON.parse(cap.out.trim());
      assert.ok('totalCodeKeys' in parsed);
      assert.ok('fileReports' in parsed);
    } finally {
      cap.restore();
    }
  });
});

describe('analyze --fail-on-missing / --fail-on-unused', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(__dirname, 'tmp-flags-f5');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('throws when --fail-on-missing and missing keys exist', async () => {
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'test.ts'),
      "'NONEXISTENT.KEY' | translate",
      'utf8',
    );

    const cap = captureConsole();
    try {
      await assert.rejects(
        () =>
          runAnalyze({
            input: 'test/fixtures',
            pattern: path.join(srcDir, '**/*.ts'),
            failOnMissing: true,
          }),
        /Analysis failed: missing translation keys detected/,
      );
    } finally {
      cap.restore();
    }
  });

  it('throws when --fail-on-unused and unused keys exist', async () => {
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'test.ts'), 'const x = 1;', 'utf8');

    const cap = captureConsole();
    try {
      await assert.rejects(
        () =>
          runAnalyze({
            input: 'test/fixtures',
            pattern: path.join(srcDir, '**/*.ts'),
            failOnUnused: true,
          }),
        /Analysis failed: unused translation keys detected/,
      );
    } finally {
      cap.restore();
    }
  });

  it('does NOT throw when --fail-on-missing and no missing keys', async () => {
    const srcDir = path.join(tmpDir, 'src');
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(srcDir, 'test.ts'),
      "'key' | translate",
      'utf8',
    );

    const cap = captureConsole();
    try {
      // Should NOT throw
      await runAnalyze({
        input: i18nDir,
        pattern: path.join(srcDir, '**/*.ts'),
        failOnMissing: true,
      });
    } finally {
      cap.restore();
    }
  });
});

describe('writeInitFiles with templateData', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(__dirname, 'tmp-template');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('uses provided templateData instead of built-in starter', async () => {
    const templateData = { custom: { greeting: 'Hello from template' } };
    const cap = captureConsole();
    try {
      const result = await writeInitFiles(
        tmpDir,
        ['en', 'de'],
        false,
        templateData,
      );
      assert.equal(result.created.length, 2);
      const enContent = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'en.json'), 'utf8'),
      );
      assert.deepEqual(enContent, templateData);
    } finally {
      cap.restore();
    }
  });

  it('falls back to buildStarterContentFor when no template', async () => {
    const cap = captureConsole();
    try {
      const result = await writeInitFiles(tmpDir, ['en'], false);
      assert.equal(result.created.length, 1);
      const enContent = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'en.json'), 'utf8'),
      );
      assert.equal(enContent.app.title, 'My App');
    } finally {
      cap.restore();
    }
  });
});
