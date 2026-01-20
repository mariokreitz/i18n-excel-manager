import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import ExcelJS from 'exceljs';

import {
  processCliOptions,
  runAnalyze,
  runTranslate,
} from '../src/cli/commands.js';

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

async function ensureTmpDir(baseName) {
  const d = path.join(process.cwd(), 'test', baseName);
  await fs.rm(d, { recursive: true, force: true });
  await fs.mkdir(d, { recursive: true });
  return d;
}

describe('CLI commands additional coverage', () => {
  let tmpDir;
  const defaultConfig = {
    sourcePath: 'test/fixtures',
    targetFile: 'test/tmp/out.xlsx',
    targetPath: 'test/tmp/out-dir',
    sheetName: 'Translations',
  };
  const config = { defaults: defaultConfig, languages: { en: 'English' } };

  beforeEach(async () => {
    tmpDir = await ensureTmpDir('tmp-cli-commands');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('processCliOptions loads config file and uses its defaults/languages (i18n-to-excel dry-run)', async () => {
    const cfgPath = path.join(tmpDir, 'cfg.json');
    const cfg = {
      defaults: {
        sourcePath: 'test/fixtures',
        targetFile: path.join(tmpDir, 'from-config.xlsx'),
        sheetName: 'Translations',
      },
      languages: { en: 'English' },
    };
    await fs.writeFile(cfgPath, JSON.stringify(cfg), 'utf8');
    const cap = captureConsole();
    try {
      await processCliOptions(
        { i18nToExcel: true, config: cfgPath, dryRun: true, report: false },
        defaultConfig,
        config,
        (o) => o,
      );
      assert.match(cap.out, /Converting i18n files from/);
      assert.match(cap.out, /Dry-run: No file was written|Dry-run/);
    } finally {
      cap.restore();
    }
  });

  it('processCliOptions respects --fail-on-duplicates from process.argv', async () => {
    const xlsx = path.join(tmpDir, 'dups.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['k', 'v1']);
    ws.addRow(['k', 'v2']);
    await wb.xlsx.writeFile(xlsx);

    const origExit = process.exit;
    const origArgv = process.argv.slice();
    const cap = captureConsole();
    let exited = false;
    process.argv.push('--fail-on-duplicates');
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    try {
      await processCliOptions(
        {
          excelToI18n: true,
          input: xlsx,
          output: tmpDir,
          sheetName: 'Translations',
        },
        defaultConfig,
        config,
        (o) => o,
      );
      assert.fail('expected exit');
    } catch (e) {
      assert.ok(exited);
      assert.match(String(e), /exit:1/);
      assert.match(cap.err + cap.out, /Duplicate keys detected in Excel: k/);
    } finally {
      cap.restore();
      process.exit = origExit;
      process.argv.length = 0;
      process.argv.push(...origArgv);
    }
  });

  it('processCliOptions init branch delegates to runInitCommand (dry-run)', async () => {
    const cap = captureConsole();
    try {
      await processCliOptions(
        { init: true, output: tmpDir, languages: 'en,de', dryRun: true },
        defaultConfig,
        config,
        (o) => o,
      );
      assert.match(cap.out, /Will create:|Created:|Skipped/);
    } finally {
      cap.restore();
    }
  });

  it('processCliOptions rejects config path outside CWD', async () => {
    const badPath = path.resolve(process.cwd(), '..', 'outside.json');
    const origExit = process.exit;
    const cap = captureConsole();
    let exited = false;
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    try {
      await processCliOptions(
        { i18nToExcel: true, config: badPath, dryRun: true },
        defaultConfig,
        config,
        (o) => o,
      );
      assert.fail('expected exit');
    } catch (e) {
      assert.ok(exited);
      assert.match(String(e), /exit:1/);
      assert.match(
        cap.err,
        /Failed to load config file|Config file path must be within the current working directory/,
      );
    } finally {
      cap.restore();
      process.exit = origExit;
    }
  });

  it('runAnalyze throws when input is missing', async () => {
    await assert.rejects(
      () => runAnalyze({}),
      /Please provide a source path using --input/,
    );
  });

  it('runAnalyze prints JSON report when report=json', async () => {
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
        report: 'json',
      });
      const output = cap.out;
      assert.ok(output.includes('"totalCodeKeys"'));
      assert.ok(output.includes('"fileReports"'));
    } finally {
      cap.restore();
    }
  });

  it('runTranslate throws when input is missing', async () => {
    await assert.rejects(
      () => runTranslate({}),
      /Please provide the Excel file path using --input/,
    );
  });

  it('runTranslate throws when API key is missing', async () => {
    const origEnv = process.env.I18N_MANAGER_API_KEY;
    delete process.env.I18N_MANAGER_API_KEY;
    try {
      await assert.rejects(
        () => runTranslate({ input: 'test.xlsx' }),
        /API Key is missing/,
      );
    } finally {
      if (origEnv !== undefined) {
        process.env.I18N_MANAGER_API_KEY = origEnv;
      }
    }
  });
});
