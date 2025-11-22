import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';
import inquirer from 'inquirer';

import {
  askForAnotherAction,
  performConversion,
} from '../src/cli/interactive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

describe('CLI interactive helpers', () => {
  it('askForAnotherAction false path prints Goodbye and exits', async () => {
    const origPrompt = inquirer.prompt;
    const origExit = process.exit;
    const cap = captureConsole();
    let exited = false;
    // stub
    inquirer.prompt = () => Promise.resolve({ again: false });
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    try {
      await askForAnotherAction();
      assert.fail('expected exit');
    } catch (e) {
      assert.match(String(e), /exit:0/);
      assert.ok(exited);
      assert.match(cap.out, /Goodbye!/);
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
      process.exit = origExit;
    }
  });

  it('performConversion toExcel dry-run prints messages and invokes follow-up prompt', async () => {
    const origPrompt = inquirer.prompt;
    const origExit = process.exit;
    let exited = false;
    inquirer.prompt = () => {
      return Promise.resolve({ again: false });
    };
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    const cap = captureConsole();
    try {
      await performConversion('toExcel', {
        sourcePath: path.join(__dirname, 'fixtures'),
        targetFile: path.join(__dirname, 'tmp.xlsx'),
        sheetName: 'Translations',
        dryRun: true,
      });
      assert.fail('expected exit');
    } catch (e) {
      assert.match(String(e), /exit:0/);
      assert.ok(exited);
      assert.match(cap.out, /Converting i18n files from/);
      assert.match(cap.out, /Dry-run: No files were written|Dry-run/);
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
      process.exit = origExit;
    }
  });

  it('performConversion toJson dry-run prints messages and invokes follow-up prompt', async () => {
    const origPrompt = inquirer.prompt;
    const origExit = process.exit;
    let exited = false;
    inquirer.prompt = () => {
      return Promise.resolve({ again: false });
    };
    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };
    const cap = captureConsole();
    try {
      // create a minimal workbook to satisfy existence checks
      const tmpXlsx = path.join(__dirname, 'tmp-interactive.xlsx');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Translations');
      ws.addRow(['Key', 'en']);
      ws.addRow(['k', 'v']);
      await wb.xlsx.writeFile(tmpXlsx);

      await performConversion('toJson', {
        sourceFile: tmpXlsx,
        targetPath: path.join(__dirname, 'tmpdir'),
        sheetName: 'Translations',
        dryRun: true,
      });
      assert.fail('expected exit');
    } catch (e) {
      assert.match(String(e), /exit:0/);
      assert.ok(exited);
      assert.match(cap.out, /Converting Excel from/);
      assert.match(cap.out, /Dry-run: No files were written|Dry-run/);
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
      process.exit = origExit;
    }
  });
});
