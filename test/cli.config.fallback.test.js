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

describe('CLI config fallback to packaged config when no CWD config exists', () => {
  it('init command uses packaged defaults (no local config) and succeeds with provided languages', async () => {
    await withTmpDir('tmp-config-fallback', async (tmp) => {
      // Ensure no config.json exists, ignore if already absent
      try {
        await fs.unlink(path.join(tmp, 'config.json'));
      } catch {
        // intentional no-op
      }

      const res = await runCliIn(tmp, [
        'init',
        '--languages',
        'en,de',
        '--dry-run',
      ]);

      assert.equal(res.code, 0, res.err || res.out);
      // Should mention initializing under the default sourcePath from packaged defaults
      // which is "public/assets/i18n" relative to CWD, resolved to an absolute path
      assert.match(
        res.out,
        /Initializing i18n directory at .*public\/assets\/i18n/,
      );
      assert.match(res.out, /Initialization completed in /);
    });
  });
});
