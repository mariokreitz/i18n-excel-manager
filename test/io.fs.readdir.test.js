import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { readDirJsonFiles } from '../src/io/fs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP = path.join(__dirname, 'tmp-fs');

describe('io/fs readDirJsonFiles', () => {
  beforeEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
    await fs.mkdir(TMP, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
  });

  it('reads only .json files and returns name+data', async () => {
    await fs.writeFile(
      path.join(TMP, 'a.json'),
      JSON.stringify({ x: 1 }),
      'utf8',
    );
    await fs.writeFile(
      path.join(TMP, 'b.json'),
      JSON.stringify({ y: 2 }),
      'utf8',
    );
    await fs.writeFile(path.join(TMP, 'ignore.txt'), 'nope', 'utf8');

    const files = await readDirJsonFiles(TMP);
    const names = files.map((f) => f.name).sort();
    assert.deepEqual(names, ['a.json', 'b.json']);
    const fileA = files.find((f) => f.name === 'a.json');
    assert.equal(fileA?.data?.x, 1);
  });

  it('throws on invalid JSON file', async () => {
    await fs.writeFile(path.join(TMP, 'bad.json'), '{bad', 'utf8');
    let threw = false;
    try {
      await readDirJsonFiles(TMP);
    } catch (e) {
      threw = true;
      assert.match(String(e.message), /Invalid JSON/);
    }
    assert.equal(threw, true);
  });
});
