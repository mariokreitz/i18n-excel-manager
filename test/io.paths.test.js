import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { safeJoinWithin, validateLanguageCode } from '../src/io/paths.js';

describe('io/paths', () => {
  it('validateLanguageCode: accepts typical codes and rejects invalid', () => {
    for (const ok of ['en', 'de', 'fr', 'pt-BR', 'zh_CN', 'en-US']) {
      assert.equal(validateLanguageCode(ok), ok);
    }
    for (const bad of [
      null,
      '',
      '..',
      '../en',
      'en/../../x',
      'a',
      'this-is-way-too-long-code-name',
    ]) {
      assert.throws(() => validateLanguageCode(bad), /Invalid language code/);
    }
  });

  it('safeJoinWithin: allows normal files and prevents traversal', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'iem-paths-base-'));
    const base = path.join(tmpRoot, 'base');
    await fs.mkdir(base, { recursive: true });

    const ok = safeJoinWithin(base, 'en.json');
    assert.match(ok, /en\.json$/);

    assert.throws(
      () => safeJoinWithin(base, '../evil.json'),
      /Unsafe output path/,
    );

    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('safeJoinWithin: rejects symlink escapes that resolve outside base', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'iem-paths-'));
    const base = path.join(tmpRoot, 'base');
    const outside = path.join(tmpRoot, 'outside');

    await fs.mkdir(base, { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, 'secret.json'), '{}', 'utf8');
    await fs.symlink(
      path.join(outside, 'secret.json'),
      path.join(base, 'en.json'),
    );

    try {
      assert.throws(
        () => safeJoinWithin(base, 'en.json'),
        /Unsafe output path/,
      );
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
