import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import ExcelJS from 'exceljs';

import {
  processCliOptions,
  runI18nToExcel,
  runTranslate,
} from '../src/cli/commands/index.js';
import { printAnalysisOutput } from '../src/cli/commands/shared/output.js';
import {
  assertExcelToI18nInvariants,
  assertI18nToExcelInvariants,
} from '../src/cli/contracts/convert.contract.js';
import {
  assertCommandInvariants,
  normalizeCommandOptions,
} from '../src/cli/contracts/index.js';
import { silentRuntime } from '../src/cli/runtime.js';
import {
  assertStringPath,
  validateLanguageCode,
} from '../src/core/validation.js';
import {
  getBuiltInProvider,
  loadCustomProvider,
} from '../src/providers/index.js';

function makeRuntime() {
  const logs = [];
  const warns = [];
  const errors = [];
  return {
    argv: [],
    env: {},
    isTTY: false,
    logs,
    warns,
    errors,
    log(...args) {
      logs.push(args.join(' '));
    },
    warn(...args) {
      warns.push(args.join(' '));
    },
    error(...args) {
      errors.push(args.join(' '));
    },
    exit() {
      throw new Error('exit should not be called');
    },
  };
}

async function mkTmp(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function runNodeScript(script, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timer = globalThis.setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new Error(`child timeout\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`),
      );
    }, timeoutMs);

    child.on('close', (code) => {
      globalThis.clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      globalThis.clearTimeout(timer);
      reject(error);
    });
  });
}

describe('patch coverage gap closure', () => {
  it('printAnalysisOutput handles quiet text, quiet json, and sarif paths', () => {
    const report = {
      totalCodeKeys: 1,
      fileReports: {
        'en.json': { missing: ['a.b'], unused: [] },
      },
    };

    const runtime = {
      messages: [],
      log(...args) {
        this.messages.push(args.join(' '));
      },
    };

    // quiet + text => no output
    printAnalysisOutput(report, { quiet: true, format: 'text' }, runtime);
    assert.equal(runtime.messages.length, 0);

    // quiet + json (machine format) => still outputs json
    printAnalysisOutput(report, { quiet: true, format: 'json' }, runtime);
    assert.ok(runtime.messages.at(-1).includes('"totalCodeKeys"'));

    // sarif path
    printAnalysisOutput(
      report,
      { format: 'sarif', input: 'test/fixtures' },
      runtime,
    );
    const sarif = JSON.parse(runtime.messages.at(-1));
    assert.equal(sarif.version, '2.1.0');
  });

  it('convert contract invariants throw for missing required paths', () => {
    assert.throws(
      () =>
        assertI18nToExcelInvariants({ sourcePath: '', targetFile: 'out.xlsx' }),
      /source path/,
    );
    assert.throws(
      () => assertI18nToExcelInvariants({ sourcePath: 'src', targetFile: '' }),
      /output file/,
    );

    assert.throws(
      () => assertExcelToI18nInvariants({ sourceFile: '', targetPath: 'out' }),
      /Excel file path/,
    );
    assert.throws(
      () =>
        assertExcelToI18nInvariants({ sourceFile: 'in.xlsx', targetPath: '' }),
      /output path/,
    );
  });

  it('contract dispatcher default branches are covered', () => {
    assert.doesNotThrow(() => assertCommandInvariants(undefined, {}));

    const normalized = normalizeCommandOptions(
      undefined,
      {},
      {
        defaultConfig: {},
        runtimeConfig: {},
        runtime: makeRuntime(),
        isDryRun: false,
      },
    );
    assert.equal(normalized.format, 'text');
    assert.equal(normalized.quiet, false);
  });

  it('silentRuntime records log/warn/error and exit code', () => {
    const rt = silentRuntime();
    rt.log('a', 'b');
    rt.warn('w');
    rt.error('e');

    assert.deepEqual(rt.logMessages, ['a b']);
    assert.deepEqual(rt.warnMessages, ['w']);
    assert.deepEqual(rt.errorMessages, ['e']);

    assert.throws(() => rt.exit(7), /process.exit\(7\)/);
    assert.equal(rt.exitCode, 7);
  });

  it('validation helpers cover negative path branches', () => {
    assert.throws(() => assertStringPath('', 'pathArg'), /non-empty string/);
    assert.throws(() => assertStringPath(null, 'pathArg'), /non-empty string/);

    // Invalid trailing segment => loop branch
    assert.throws(
      () => validateLanguageCode('en--US'),
      /Invalid language code/,
    );

    // Force split() empty result branch (defensive guard)
    const originalSplit = String.prototype.split;
    try {
      String.prototype.split = function mockedSplit(separator) {
        if (
          this.valueOf() === '__FORCE_EMPTY_PARTS__' &&
          separator instanceof RegExp
        ) {
          return [];
        }
        return originalSplit.call(this, separator);
      };
      assert.throws(
        () => validateLanguageCode('__FORCE_EMPTY_PARTS__'),
        /Invalid language code/,
      );
    } finally {
      String.prototype.split = originalSplit;
    }
  });

  it('runI18nToExcel hits conversion failure catch path', async () => {
    await assert.rejects(
      () =>
        runI18nToExcel({
          sourcePath: '/does/not/exist',
          targetFile: '/tmp/out.xlsx',
          common: { dryRun: false, sheetName: 'Translations' },
        }),
      /File does not exist|No JSON files found|Could not read i18n files|ENOENT/,
    );
  });

  it('processCliOptions covers unknown action dispatch error path', async () => {
    const runtime = silentRuntime();
    await assert.rejects(
      () => processCliOptions({}, {}, {}, (x) => x, runtime),
      /process.exit\(1\)/,
    );
    assert.ok(
      runtime.errorMessages.some((m) => m.includes('No command selected')),
      'should log unknown action error before exiting',
    );
  });

  it('providers branch coverage: unknown built-in, fallback canonical path, and missing translateBatch', async () => {
    assert.throws(
      () => getBuiltInProvider('unknown-provider'),
      /Unknown provider/,
    );

    const tempRoot = await mkTmp('iem-provider-');
    try {
      const missingProvider = path.join(tempRoot, 'missing-provider.mjs');
      await assert.rejects(
        () =>
          loadCustomProvider(missingProvider, 'api-key', 'model', {
            restrictToCwd: false,
          }),
        /ERR_MODULE_NOT_FOUND|Cannot find module/,
      );

      const invalidProviderFile = path.join(tempRoot, 'invalid-provider.mjs');
      await fs.writeFile(
        invalidProviderFile,
        'export default class InvalidProvider {\n  constructor() {}\n}\n',
        'utf8',
      );
      await assert.rejects(
        () =>
          loadCustomProvider(invalidProviderFile, 'api-key', 'model', {
            restrictToCwd: false,
          }),
        /must implement translateBatch/,
      );
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('runTranslate covers quiet/json info routing, custom provider warning, and success spinner path', async () => {
    const localTmpBase = path.join(
      process.cwd(),
      'test',
      'tmp-patch-translate-',
    );
    await fs.mkdir(path.dirname(localTmpBase), { recursive: true });
    const tempRoot = await fs.mkdtemp(localTmpBase);
    const workbookPath = path.join(tempRoot, 'translations.xlsx');
    const providerPath = path.join(tempRoot, 'custom-provider.mjs');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['key', 'en', 'de']);
    ws.addRow(['app.title', 'Hello', null]);
    await wb.xlsx.writeFile(workbookPath);

    await fs.writeFile(
      providerPath,
      `export default class CustomProvider {
         async translateBatch(texts) {
           return texts.map((t) => '[de] ' + t);
         }
       }\n`,
      'utf8',
    );

    const quietRuntime = makeRuntime();
    await assert.rejects(
      () =>
        runTranslate(
          {
            input: path.join(tempRoot, 'missing.xlsx'),
            apiKey: 'x',
            quiet: true,
          },
          quietRuntime,
        ),
      /File not found|does not exist|ENOENT/,
    );
    assert.equal(
      quietRuntime.logs.some((m) => m.includes('--source-lang')),
      false,
      'quiet mode should suppress info logs',
    );

    const jsonRuntime = makeRuntime();
    await assert.rejects(
      () =>
        runTranslate(
          {
            input: path.join(tempRoot, 'missing-2.xlsx'),
            apiKey: 'x',
            format: 'json',
          },
          jsonRuntime,
        ),
      /File not found|does not exist|ENOENT/,
    );
    assert.ok(
      jsonRuntime.errors.some((m) => m.includes('--source-lang')),
      'json mode should route informational hints to runtime.error',
    );

    const successRuntime = makeRuntime();
    await runTranslate(
      {
        input: workbookPath,
        apiKey: 'x',
        sourceLang: 'en',
        provider: providerPath,
      },
      successRuntime,
    );
    assert.ok(
      successRuntime.warns.some((m) => m.includes('Custom provider loaded')),
      'custom provider warning should be emitted',
    );

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('runAnalyzeWatch covers watch setup, change handling, and error handling in callback', async () => {
    const tempRoot = await mkTmp('iem-watch-');
    const srcDir = path.join(tempRoot, 'src');
    const i18nDir = path.join(tempRoot, 'i18n');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(i18nDir, { recursive: true });
    const sourceFile = path.join(srcDir, 'a.ts');
    await fs.writeFile(sourceFile, "this.translate.instant('a.b');\n", 'utf8');
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      '{"a":{"b":"B"}}\n',
      'utf8',
    );

    const analyzeModule = pathToFileURL(
      path.join(process.cwd(), 'src/cli/commands/analyze.command.js'),
    ).href;

    const okScript = String.raw`
      import fs from 'node:fs/promises';
      import { runAnalyzeWatch } from '${analyzeModule}';
      const options = {
        input: ${JSON.stringify(i18nDir)},
        pattern: ${JSON.stringify(path.join(srcDir, '**/*.ts'))},
      };
      const runtime = {
        argv: [],
        env: process.env,
        isTTY: false,
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        exit: (code = 0) => process.exit(code),
      };
      const addedFile = ${JSON.stringify(path.join(i18nDir, 'added.watch.json'))};
      setTimeout(async () => {
        await fs.writeFile(addedFile, '{"watch":"add"}\n', 'utf8');
      }, 1400);
      setTimeout(async () => {
        await fs.unlink(addedFile);
      }, 2200);
      setTimeout(() => process.exit(0), 3600);
      runAnalyzeWatch(options, runtime).catch((e) => {
        console.error(e?.message || e);
        process.exit(1);
      });
    `;

    const okResult = await runNodeScript(okScript, 8000);
    assert.equal(okResult.code, 0);
    assert.match(okResult.stdout, /Watch mode enabled/);
    assert.match(okResult.stdout, /File add:/);
    assert.match(okResult.stdout, /File unlink:/);

    const errorScript = `
      import fs from 'node:fs/promises';
      import { runAnalyzeWatch } from '${analyzeModule}';
      const options = {
        input: ${JSON.stringify(i18nDir)},
        pattern: ${JSON.stringify(path.join(srcDir, '**/*.ts'))},
      };
      const runtime = {
        argv: [],
        env: process.env,
        isTTY: false,
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        exit: (code = 0) => process.exit(code),
      };
      setTimeout(async () => {
        await fs.writeFile(${JSON.stringify(path.join(i18nDir, 'en.json'))}, '{invalid-json', 'utf8');
      }, 1400);
      setTimeout(async () => {
        await fs.writeFile(${JSON.stringify(path.join(i18nDir, 'en.json'))}, '{still-invalid', 'utf8');
      }, 2200);
      setTimeout(() => process.exit(0), 3600);
      runAnalyzeWatch(options, runtime).catch((e) => {
        console.error(e?.message || e);
        process.exit(1);
      });
    `;

    const errorResult = await runNodeScript(errorScript, 8000);
    assert.equal(errorResult.code, 0);
    assert.match(
      errorResult.stdout + errorResult.stderr,
      /Could not read i18n files|Invalid JSON/,
    );

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('runAnalyzeWatch routes watch info to stderr in machine format and suppresses it in quiet mode', async () => {
    const tempRoot = await mkTmp('iem-watch-routing-');
    const srcDir = path.join(tempRoot, 'src');
    const i18nDir = path.join(tempRoot, 'i18n');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(i18nDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'a.ts'),
      "'app.title' | translate\n",
      'utf8',
    );
    await fs.writeFile(
      path.join(i18nDir, 'en.json'),
      '{"app":{"title":"Hello"}}\n',
      'utf8',
    );

    const analyzeModule = pathToFileURL(
      path.join(process.cwd(), 'src/cli/commands/analyze.command.js'),
    ).href;

    const machineScript = String.raw`
      import { runAnalyzeWatch } from '${analyzeModule}';
      const options = {
        input: ${JSON.stringify(i18nDir)},
        pattern: ${JSON.stringify(path.join(srcDir, '**/*.ts'))},
        format: 'json',
      };
      const runtime = {
        argv: [],
        env: process.env,
        isTTY: false,
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        exit: (code = 0) => process.exit(code),
      };
      setTimeout(() => process.exit(0), 1700);
      runAnalyzeWatch(options, runtime).catch((e) => {
        console.error(e?.message || e);
        process.exit(1);
      });
    `;

    const machineResult = await runNodeScript(machineScript, 6000);
    assert.equal(machineResult.code, 0);
    assert.match(machineResult.stderr, /Watch mode enabled/);
    assert.doesNotMatch(machineResult.stdout, /Watch mode enabled/);
    assert.match(machineResult.stdout, /^\s*\{/);

    const quietScript = String.raw`
      import { runAnalyzeWatch } from '${analyzeModule}';
      const options = {
        input: ${JSON.stringify(i18nDir)},
        pattern: ${JSON.stringify(path.join(srcDir, '**/*.ts'))},
        quiet: true,
      };
      const runtime = {
        argv: [],
        env: process.env,
        isTTY: false,
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        exit: (code = 0) => process.exit(code),
      };
      setTimeout(() => process.exit(0), 1700);
      runAnalyzeWatch(options, runtime).catch((e) => {
        console.error(e?.message || e);
        process.exit(1);
      });
    `;

    const quietResult = await runNodeScript(quietScript, 6000);
    assert.equal(quietResult.code, 0);
    assert.doesNotMatch(
      quietResult.stdout + quietResult.stderr,
      /Watch mode enabled/,
    );

    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
