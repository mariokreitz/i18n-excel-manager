import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertCommandInvariants,
  normalizeCommandOptions,
} from '../src/cli/contracts/index.js';
import { silentRuntime } from '../src/cli/runtime.js';

describe('CLI contracts', () => {
  it('analyze contract rejects missing input', () => {
    const runtime = silentRuntime();
    const options = normalizeCommandOptions(
      'analyze',
      {},
      {
        defaultConfig: {},
        runtime,
        runtimeConfig: {},
        isDryRun: false,
      },
    );

    assert.throws(
      () => assertCommandInvariants('analyze', options, { runtime }),
      /Please provide a source path using --input/,
    );
  });

  it('translate contract rejects missing API key in CLI flow', () => {
    const runtime = silentRuntime();
    const options = normalizeCommandOptions(
      'translate',
      { input: 'test/tmp-interactive.xlsx' },
      {
        defaultConfig: {},
        runtime,
        runtimeConfig: {},
        isDryRun: false,
      },
    );

    assert.throws(
      () => assertCommandInvariants('translate', options, { runtime }),
      /API Key is missing/,
    );
  });

  it('analyzeThenTranslate contract rejects watch mode combination', () => {
    const runtime = silentRuntime();
    const options = normalizeCommandOptions(
      'analyzeThenTranslate',
      { input: 'test/fixtures', watch: true, translate: true },
      {
        defaultConfig: {},
        runtime,
        runtimeConfig: {},
        isDryRun: false,
      },
    );

    assert.throws(
      () =>
        assertCommandInvariants('analyzeThenTranslate', options, { runtime }),
      /Cannot combine --watch and --translate/,
    );
  });

  it('analyzeThenTranslate contract requires excel input when not using legacy xlsx bridge', () => {
    const runtime = silentRuntime();
    const options = normalizeCommandOptions(
      'analyzeThenTranslate',
      { input: 'test/fixtures', translate: true },
      {
        defaultConfig: { targetFile: '' },
        runtime,
        runtimeConfig: {},
        isDryRun: false,
      },
    );

    assert.throws(
      () =>
        assertCommandInvariants('analyzeThenTranslate', options, { runtime }),
      /Please provide --excel-input/,
    );
  });

  it('analyzeThenTranslate contract preserves legacy xlsx bridge', () => {
    const runtime = silentRuntime();
    const options = normalizeCommandOptions(
      'analyzeThenTranslate',
      { input: 'test/tmp-interactive.xlsx', translate: true },
      {
        defaultConfig: { targetFile: '' },
        runtime,
        runtimeConfig: {},
        isDryRun: false,
      },
    );

    assert.doesNotThrow(() =>
      assertCommandInvariants('analyzeThenTranslate', options, { runtime }),
    );
  });
});
