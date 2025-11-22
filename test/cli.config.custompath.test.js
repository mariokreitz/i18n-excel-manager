import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCliIn(cwd, args) {
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      [path.resolve(projectRoot, 'cli.js'), ...args],
      {
        cwd,
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += String(d)));
    proc.stderr.on('data', (d) => (err += String(d)));
    proc.on('exit', (code) => resolve({ code, out, err }));
  });
}

async function withTmpDir(name, fn) {
  const dir = path.join(projectRoot, 'test', name);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('CLI config: custom path and precedence', () => {
  it('uses --config <custom.json> when no default config.json exists in CWD', async () => {
    await withTmpDir('tmp-config-custom', async (tmp) => {
      const cfg = {
        languages: { en: 'English' },
        defaults: {
          sourcePath: 'my-locales',
          targetFile: 'my-out.xlsx',
          targetPath: 'my-locales',
          sheetName: 'Translations',
        },
      };
      const customCfg = path.join(tmp, 'custom-config.json');
      await fs.writeFile(customCfg, JSON.stringify(cfg), 'utf8');

      const localesDir = path.join(tmp, 'my-locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ hello: 'Hello' }),
        'utf8',
      );

      const res = await runCliIn(tmp, [
        'i18n-to-excel',
        '--dry-run',
        '--no-report',
        '--config',
        'custom-config.json',
      ]);
      assert.equal(res.code, 0, res.err || res.out);
      assert.match(
        res.out,
        /Converting i18n files from my-locales to my-out.xlsx/,
      );
    });
  });

  it('CLI flags override config defaults', async () => {
    await withTmpDir('tmp-config-override', async (tmp) => {
      const cfg = {
        languages: { en: 'English' },
        defaults: {
          sourcePath: 'cfg-locales',
          targetFile: 'cfg-out.xlsx',
          targetPath: 'cfg-locales',
          sheetName: 'Translations',
        },
      };
      await fs.writeFile(
        path.join(tmp, 'config.json'),
        JSON.stringify(cfg),
        'utf8',
      );

      // Prepare both config default directory and the CLI override directory
      await fs.mkdir(path.join(tmp, 'cfg-locales'), { recursive: true });
      await fs.writeFile(
        path.join(tmp, 'cfg-locales/en.json'),
        JSON.stringify({ hi: 'Hi' }),
        'utf8',
      );

      await fs.mkdir(path.join(tmp, 'cli-locales'), { recursive: true });
      await fs.writeFile(
        path.join(tmp, 'cli-locales/en.json'),
        JSON.stringify({ hi: 'Hi from CLI' }),
        'utf8',
      );

      const res = await runCliIn(tmp, [
        'i18n-to-excel',
        '--input',
        'cli-locales',
        '--output',
        'cli-out.xlsx',
        '--dry-run',
        '--no-report',
      ]);

      assert.equal(res.code, 0, res.err || res.out);
      // Should use CLI-provided paths, not config defaults
      assert.match(
        res.out,
        /Converting i18n files from cli-locales to cli-out.xlsx/,
      );
    });
  });
});
