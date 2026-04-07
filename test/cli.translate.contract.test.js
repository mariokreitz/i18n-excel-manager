import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
        env: {
          ...process.env,
          CI: '1',
          FORCE_COLOR: '0',
          GEMINI_API_KEY: '',
          I18N_MANAGER_API_KEY: '',
        },
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

describe('CLI translate contract', () => {
  it('supports explicit translate command in non-interactive mode', async () => {
    const res = await runCli([
      'translate',
      '--api-key',
      'dummy',
      '--input',
      'test/does-not-exist.xlsx',
    ]);
    assert.notEqual(res.code, 0);
    assert.match(res.out + res.err, /File not found|does not exist|ENOENT/i);
  });

  it('analyze --translate with Excel --input follows legacy translate bridge', async () => {
    const res = await runCli([
      'analyze',
      '--translate',
      '--input',
      'test/tmp-interactive.xlsx',
    ]);

    assert.notEqual(res.code, 0);
    assert.match(res.out + res.err, /API Key is missing/);
  });

  it('analyze --translate runs composed flow with --excel-input', async () => {
    const res = await runCli([
      'analyze',
      '--translate',
      '--input',
      'test/fixtures',
      '--pattern',
      'test/**/*.js',
      '--excel-input',
      'test/tmp-interactive.xlsx',
    ]);

    assert.notEqual(res.code, 0);
    assert.match(res.out + res.err, /Analysis Report/);
    assert.match(res.out + res.err, /API Key is missing/);
  });

  it('analyze --translate rejects incompatible watch mode before execution', async () => {
    const res = await runCli([
      'analyze',
      '--translate',
      '--watch',
      '--input',
      'test/fixtures',
    ]);

    assert.notEqual(res.code, 0);
    assert.match(
      res.out + res.err,
      /Cannot combine --watch and --translate on analyze/,
    );
  });

  it('translate with --provider does not require Gemini API key env/flag', async () => {
    const res = await runCli([
      'translate',
      '--provider',
      'test/fixtures/custom-provider.no-key.mjs',
      '--input',
      'test/does-not-exist.xlsx',
    ]);

    assert.notEqual(res.code, 0);
    assert.match(res.out + res.err, /File not found|does not exist|ENOENT/i);
    assert.doesNotMatch(res.out + res.err, /API Key is missing/);
  });
});
