import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCliIn(cwd, args) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [path.resolve(projectRoot, 'cli.js'), ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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

describe('CLI config autoload from CWD', () => {
  it('uses config.json defaults when present without --config', async () => {
    await withTmpDir('tmp-config-autoload', async (tmp) => {
      // Arrange: write config.json with defaults pointing to relative paths
      const cfg = {
        languages: { en: 'English' },
        defaults: {
          sourcePath: 'locales',
          targetFile: 'out.xlsx',
          targetPath: 'locales',
          sheetName: 'Translations',
        },
      };
      await fs.writeFile(path.join(tmp, 'config.json'), JSON.stringify(cfg), 'utf8');

      // And create minimal i18n source files
      const localesDir = path.join(tmp, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(path.join(localesDir, 'en.json'), JSON.stringify({ hello: 'Hello' }), 'utf8');

      // Act: run CLI without -i/-o, only dry-run
      const res = await runCliIn(tmp, ['i18n-to-excel', '--dry-run', '--no-report']);

      // Assert
      assert.equal(res.code, 0, res.err || res.out);
      // It should reference our config defaults (relative paths)
      assert.match(res.out, /Converting i18n files from locales to out.xlsx/);
      assert.match(res.out, /Dry-run: No file was written|Dry-run/);
    });
  });
});
