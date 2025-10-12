import assert from 'node:assert/strict';
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

  it('safeJoinWithin: allows normal files and prevents traversal', () => {
    const base = path.resolve('/tmp/base-dir');
    const ok = safeJoinWithin(base, 'en.json');
    assert.ok(ok.startsWith(base));

    assert.throws(
      () => safeJoinWithin(base, '../evil.json'),
      /Unsafe output path/,
    );
  });
});
