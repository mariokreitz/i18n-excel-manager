import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';
import inquirer from 'inquirer';

import {
  askForAnotherAction,
  handleToExcel,
  handleToJson,
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

  it('handleToExcel dry-run prints messages and invokes follow-up prompt', async () => {
    const origPrompt = inquirer.prompt;
    const origExit = process.exit;
    let exited = false;

    // Mock prompt to return answers sequentially
    // 1. handleToExcel questions
    // 2. askForAnotherAction question (false -> exit)
    inquirer.prompt = async (questions) => {
      if (Array.isArray(questions) && questions[0].name === 'sourcePath') {
        return {
          sourcePath: path.join(__dirname, 'fixtures'),
          targetFile: path.join(__dirname, 'tmp.xlsx'),
          sheetName: 'Translations',
          dryRun: true,
        };
      }
      if (Array.isArray(questions) && questions[0].name === 'again') {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    const cap = captureConsole();
    try {
      await handleToExcel(
        { sourcePath: 'd', targetFile: 'd', sheetName: 'd' },
        {},
      );
      assert.fail('expected exit');
    } catch (e) {
      assert.match(String(e), /exit:0/);
      assert.ok(exited);
      // runI18nToExcel output
      assert.match(cap.out, /Converting i18n files from/);
      assert.match(cap.out, /Dry-run: No file was written/); // Note: runI18nToExcel uses logDryRunSingle
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
      process.exit = origExit;
    }
  });

  it('handleToJson dry-run prints messages and invokes follow-up prompt', async () => {
    const origPrompt = inquirer.prompt;
    const origExit = process.exit;
    let exited = false;

    // create a minimal workbook to satisfy existence checks
    const tmpXlsx = path.join(__dirname, 'tmp-interactive.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['k', 'v']);
    await wb.xlsx.writeFile(tmpXlsx);

    inquirer.prompt = async (questions) => {
      if (Array.isArray(questions) && questions[0].name === 'sourceFile') {
        return {
          sourceFile: tmpXlsx,
          targetPath: path.join(__dirname, 'tmpdir'),
          sheetName: 'Translations',
          dryRun: true,
        };
      }
      if (Array.isArray(questions) && questions[0].name === 'again') {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    const cap = captureConsole();
    try {
      await handleToJson(
        { targetFile: 'd', targetPath: 'd', sheetName: 'd' },
        {},
      );
      assert.fail('expected exit');
    } catch (e) {
      assert.match(String(e), /exit:0/);
      assert.ok(exited);
      // runExcelToI18n output
      assert.match(cap.out, /Converting Excel from/);
      assert.match(cap.out, /Dry-run: No files were written/); // logDryRunPlural
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
      process.exit = origExit;
    }
  });
});
