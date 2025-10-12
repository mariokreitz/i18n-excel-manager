import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
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
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
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

const TMP_DIR = path.join(__dirname, 'tmp-cli', 'init-tests');

async function cleanTmp() {
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
}

describe('CLI init command', () => {
  beforeEach(async () => {
    await cleanTmp();
  });

  it('dry-run prints planned creations and does not write files', async () => {
    const target = path.join(TMP_DIR, 'case1');
    const res = await runCli(['init', '-o', target, '-l', 'en,de', '-d']);
    assert.equal(res.code, 0, res.err || res.out);
    assert.match(res.out, /Will create:/);
    assert.match(res.out, /Dry-run: No files were written|Dry-run/);
    // files should not exist
    await assert.rejects(fs.readFile(path.join(target, 'en.json')));
    await assert.rejects(fs.readFile(path.join(target, 'de.json')));
  });

  it('creates files in a fresh directory and prints summary', async () => {
    const target = path.join(TMP_DIR, 'case2');
    const res = await runCli(['init', '-o', target, '-l', 'en,de']);
    assert.equal(res.code, 0, res.err || res.out);
    assert.match(res.out, /Initialization completed/);
    // verify files written and have expected structure
    const en = JSON.parse(
      await fs.readFile(path.join(target, 'en.json'), 'utf8'),
    );
    const de = JSON.parse(
      await fs.readFile(path.join(target, 'de.json'), 'utf8'),
    );
    assert.equal(typeof en.app?.title, 'string');
    assert.equal(typeof en.app?.welcome, 'string');
    assert.equal(typeof de.app?.title, 'string');
    assert.equal(typeof de.app?.welcome, 'string');
  });

  it('does not overwrite existing files and reports skipped', async () => {
    const target = path.join(TMP_DIR, 'case3');
    await fs.mkdir(target, { recursive: true });
    // pre-create en.json
    await fs.writeFile(
      path.join(target, 'en.json'),
      JSON.stringify({ app: { title: 'Keep me' } }, null, 2),
    );
    const res = await runCli(['init', '-o', target, '-l', 'en,de']);
    assert.equal(res.code, 0, res.err || res.out);
    assert.match(res.out, /Skipped existing file/);
    // ensure en.json preserved
    const en = JSON.parse(
      await fs.readFile(path.join(target, 'en.json'), 'utf8'),
    );
    assert.equal(en.app.title, 'Keep me');
  });
});
