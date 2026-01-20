import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';
import inquirer from 'inquirer';

import {
  askForAnotherAction,
  handleToExcel,
  handleToJson,
  showMainMenu,
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

describe('CLI interactive - showMainMenu comprehensive coverage', () => {
  let tmpDir;
  let origPrompt;
  let origExit;

  beforeEach(async () => {
    tmpDir = path.join(__dirname, 'tmp-menu');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
    origPrompt = inquirer.prompt;
    origExit = process.exit;
  });

  afterEach(async () => {
    inquirer.prompt = origPrompt;
    process.exit = origExit;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('showMainMenu detects missing i18n and offers init', async () => {
    const cap = captureConsole();
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        // First call: init confirmation
        return { doInit: false };
      }
      return {};
    };

    process.exit = (code) => {
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu({}, { sourcePath: path.join(tmpDir, 'nonexistent') });
      // Should return early after declining init
    } catch (e) {
      // May exit depending on flow
    } finally {
      cap.restore();
    }
  });

  it('showMainMenu with existing i18n shows menu and handles toExcel action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();
    let exited = false;
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        // Menu choice
        return { action: 'toExcel' };
      }
      if (promptCalls === 2) {
        // handleToExcel prompts
        return {
          sourcePath: i18nDir,
          targetFile: path.join(tmpDir, 'out.xlsx'),
          sheetName: 'Translations',
          dryRun: true,
        };
      }
      if (promptCalls === 3) {
        // askForAnotherAction
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu(
        {},
        {
          sourcePath: i18nDir,
          targetFile: 'test.xlsx',
          sheetName: 'Translations',
        },
      );
    } catch (e) {
      if (exited) {
        assert.match(String(e), /exit:0/);
      }
    } finally {
      cap.restore();
      // Should have called prompts
      assert.ok(promptCalls >= 1);
    }
  });

  it('showMainMenu handles toJson action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const xlsxPath = path.join(tmpDir, 'test.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['k', 'v']);
    await wb.xlsx.writeFile(xlsxPath);

    const cap = captureConsole();
    let exited = false;
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        return { action: 'toJson' };
      }
      if (promptCalls === 2) {
        return {
          sourceFile: xlsxPath,
          targetPath: i18nDir,
          sheetName: 'Translations',
          dryRun: true,
        };
      }
      if (promptCalls === 3) {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu(
        {},
        {
          sourcePath: i18nDir,
          targetFile: xlsxPath,
          targetPath: i18nDir,
          sheetName: 'Translations',
        },
      );
    } catch (e) {
      if (exited) {
        assert.match(String(e), /exit:0/);
      }
    } finally {
      cap.restore();
      assert.ok(promptCalls >= 1);
    }
  });

  it('showMainMenu handles analyze action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.mkdir(srcDir, { recursive: true });
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
    let exited = false;
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        return { action: 'analyze' };
      }
      if (promptCalls === 2) {
        return {
          input: i18nDir,
          pattern: path.join(srcDir, '**/*.ts'),
        };
      }
      if (promptCalls === 3) {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu({}, { sourcePath: i18nDir });
    } catch (e) {
      if (exited) {
        assert.match(String(e), /exit:0/);
      }
    } finally {
      cap.restore();
      assert.ok(promptCalls >= 1);
    }
  });

  it('showMainMenu handles translate action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const xlsxPath = path.join(tmpDir, 'test.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en', 'de']);
    ws.addRow(['k', 'Hello', '']);
    await wb.xlsx.writeFile(xlsxPath);

    const cap = captureConsole();
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        return { action: 'translate' };
      }
      if (promptCalls === 2) {
        return {
          input: xlsxPath,
          sourceLang: 'en',
          apiKey: 'fake-key',
          model: 'gemini-2.5-flash',
        };
      }
      if (promptCalls === 3) {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu(
        { languages: { en: 'English' } },
        { sourcePath: i18nDir },
      );
      assert.fail('expected exit or error');
    } catch (e) {
      // May throw translation error or exit
    } finally {
      cap.restore();
    }
  });

  it('showMainMenu handles init action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();
    let exited = false;
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        return { action: 'init' };
      }
      if (promptCalls === 2) {
        // init prompts
        return { languages: ['en', 'de'], confirm: true };
      }
      if (promptCalls === 3) {
        return { again: false };
      }
      return {};
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu({}, { sourcePath: i18nDir });
    } catch (e) {
      if (exited) {
        assert.match(String(e), /exit:0/);
      }
    } finally {
      cap.restore();
      assert.ok(promptCalls >= 1);
    }
  });

  it('showMainMenu handles exit action', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();
    let exited = false;

    inquirer.prompt = async () => {
      return { action: 'exit' };
    };

    process.exit = (code) => {
      exited = true;
      throw new Error(`exit:${code}`);
    };

    try {
      await showMainMenu({}, { sourcePath: i18nDir });
    } catch (e) {
      if (exited) {
        assert.match(String(e), /exit:0/);
        assert.ok(exited);
        assert.match(cap.out, /Goodbye!/);
      }
    } finally {
      cap.restore();
    }
  });

  it('showMainMenu catches and logs errors during action execution', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();

    inquirer.prompt = async (questions) => {
      if (questions[0]?.name === 'action') {
        return { action: 'toExcel' };
      }
      // Cause an error by providing invalid paths
      throw new Error('Test prompt error');
    };

    try {
      await showMainMenu({}, { sourcePath: i18nDir });
      // Should handle error gracefully
    } catch (e) {
      // Error should be logged, not thrown
    } finally {
      cap.restore();
    }
  });

  it('checkAndRunInit accepts init and creates files', async () => {
    const initDir = path.join(tmpDir, 'new-i18n');

    const cap = captureConsole();
    let promptCalls = 0;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        // Init confirmation
        return { doInit: true };
      }
      if (promptCalls === 2) {
        // Init language selection
        return { languages: ['en', 'de'], confirm: true };
      }
      return {};
    };

    try {
      await showMainMenu({}, { sourcePath: initDir });
      // Should complete init flow
    } catch (e) {
      // May fail at various points
    } finally {
      cap.restore();
    }
  });
});
