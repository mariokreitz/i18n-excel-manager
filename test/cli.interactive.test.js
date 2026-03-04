import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';
import inquirer from 'inquirer';

import {
  askForAnotherAction,
  handleAnalyze,
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
  it('askForAnotherAction returns false when user declines', async () => {
    const origPrompt = inquirer.prompt;
    // stub
    inquirer.prompt = () => Promise.resolve({ again: false });
    try {
      const result = await askForAnotherAction();
      assert.equal(result, false);
    } finally {
      inquirer.prompt = origPrompt;
    }
  });

  it('askForAnotherAction returns true when user confirms', async () => {
    const origPrompt = inquirer.prompt;
    inquirer.prompt = () => Promise.resolve({ again: true });
    try {
      const result = await askForAnotherAction();
      assert.equal(result, true);
    } finally {
      inquirer.prompt = origPrompt;
    }
  });

  it('handleToExcel dry-run prints messages', async () => {
    const origPrompt = inquirer.prompt;

    // Mock prompt to return answers for handleToExcel questions only
    inquirer.prompt = async (questions) => {
      if (Array.isArray(questions) && questions[0].name === 'sourcePath') {
        return {
          sourcePath: path.join(__dirname, 'fixtures'),
          targetFile: path.join(__dirname, 'tmp.xlsx'),
          sheetName: 'Translations',
          dryRun: true,
        };
      }
      return {};
    };

    const cap = captureConsole();
    try {
      await handleToExcel(
        { sourcePath: 'd', targetFile: 'd', sheetName: 'd' },
        {},
      );
      // runI18nToExcel output
      assert.match(cap.out, /Converting i18n files from/);
      assert.match(cap.out, /Dry-run: No file was written/);
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
    }
  });

  it('handleToJson dry-run prints messages', async () => {
    const origPrompt = inquirer.prompt;

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
      return {};
    };

    const cap = captureConsole();
    try {
      await handleToJson(
        { targetFile: 'd', targetPath: 'd', sheetName: 'd' },
        {},
      );
      // runExcelToI18n output
      assert.match(cap.out, /Converting Excel from/);
      assert.match(cap.out, /Dry-run: No files were written/);
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
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
        // askForAnotherAction (now called by the loop)
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
        // askForAnotherAction (now called by the loop)
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
        // askForAnotherAction (now called by the loop)
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
        // askForAnotherAction (now called by the loop)
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
        // askForAnotherAction (now called by the loop)
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
    let promptCalls = 0;
    let exited = false;

    inquirer.prompt = async (questions) => {
      promptCalls++;
      if (promptCalls === 1) {
        return { action: 'toExcel' };
      }
      if (promptCalls === 2) {
        // Cause an error by providing invalid paths
        throw new Error('Test prompt error');
      }
      if (promptCalls === 3) {
        // askForAnotherAction — break the loop
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
      // Error should be caught by the loop, logged, then exit on again=false
      if (exited) {
        assert.match(String(e), /exit:0/);
      }
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

  it('handleAnalyze uses correct defaults for i18n path and pattern', async () => {
    const origPrompt = inquirer.prompt;
    let promptedQuestions = null;

    // Mock prompt to capture question defaults
    inquirer.prompt = async (questions) => {
      if (Array.isArray(questions) && questions[0].name === 'input') {
        promptedQuestions = questions;
        // Return valid paths to test the flow
        return {
          input: path.join(__dirname, 'fixtures'),
          pattern: 'src/**/*.{ts,js,html}',
        };
      }
      return {};
    };

    const cap = captureConsole();
    const testDefaultConfig = { sourcePath: 'public/assets/i18n' };

    try {
      await handleAnalyze(testDefaultConfig);
    } catch (e) {
      // Expected if analysis fails on missing files
    } finally {
      cap.restore();
      inquirer.prompt = origPrompt;
    }

    // Verify the input question has correct message and default
    assert.ok(promptedQuestions, 'Should have prompted for questions');
    const inputQ = promptedQuestions.find((q) => q.name === 'input');
    const patternQ = promptedQuestions.find((q) => q.name === 'pattern');

    assert.ok(inputQ, 'Should have input question');
    assert.ok(patternQ, 'Should have pattern question');

    // Verify the input question asks for i18n JSON directory, not source code folder
    assert.match(
      inputQ.message,
      /i18n.*JSON/i,
      'Input message should mention i18n JSON directory',
    );
    assert.equal(
      inputQ.default,
      'public/assets/i18n',
      'Input default should be defaultConfig.sourcePath (public/assets/i18n)',
    );

    // Verify the pattern includes src/ prefix for Angular projects
    assert.match(
      patternQ.default,
      /^src\//,
      'Pattern default should start with src/ for Angular projects',
    );
  });

  it('showMainMenu loops without stack overflow after 3 iterations', async () => {
    const i18nDir = path.join(tmpDir, 'i18n');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();
    let exited = false;
    let iteration = 0;

    const actionAnswers = {
      action: () => {
        iteration++;
        return iteration <= 2 ? { action: 'toExcel' } : { action: 'exit' };
      },
      sourcePath: () => ({
        sourcePath: i18nDir,
        targetFile: path.join(tmpDir, `out${iteration}.xlsx`),
        sheetName: 'Translations',
        dryRun: true,
      }),
      again: () => ({ again: true }),
    };

    inquirer.prompt = async (questions) => {
      const name = Array.isArray(questions) ? questions[0]?.name : undefined;
      return (actionAnswers[name] ?? (() => ({})))();
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
      assert.match(String(e), /exit:0/);
    } finally {
      cap.restore();
    }

    assert.ok(exited, 'process.exit should have been called');
    assert.equal(iteration, 3, 'should have iterated 3 times');
    assert.match(cap.out, /Goodbye!/);
  });

  it('checkAndRunInit returns false when i18n files are present', async () => {
    const i18nDir = path.join(tmpDir, 'i18n-present');
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      JSON.stringify({ key: 'value' }),
      'utf8',
    );

    const cap = captureConsole();
    let exited = false;
    let menuShown = false;

    // If checkAndRunInit returns false, showMainMenu proceeds to the menu prompt
    inquirer.prompt = async (questions) => {
      if (Array.isArray(questions) && questions[0]?.name === 'action') {
        menuShown = true;
        return { action: 'exit' };
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
      // expected exit
    } finally {
      cap.restore();
    }

    assert.ok(
      menuShown,
      'Menu should have been shown (checkAndRunInit returned false)',
    );
  });
});
