import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  GeminiProvider as LegacyGeminiProvider,
  TranslationProvider as LegacyTranslationProvider,
} from '../src/core/translator.js';
import {
  createBuiltInProvider,
  getBuiltInProvider,
  loadCustomProvider,
  TranslationProvider,
} from '../src/providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('providers layer', () => {
  it('exposes gemini as built-in provider', () => {
    const ProviderClass = getBuiltInProvider('gemini');
    assert.equal(typeof ProviderClass, 'function');
    assert.equal(ProviderClass, LegacyGeminiProvider);
  });

  it('createBuiltInProvider creates a provider instance', () => {
    const provider = createBuiltInProvider('gemini', 'fake-key', 'test-model');
    assert.equal(typeof provider.translateBatch, 'function');
    assert.equal(provider instanceof TranslationProvider, true);
  });

  it('core/translator remains a backward-compatible shim', () => {
    assert.equal(LegacyTranslationProvider, TranslationProvider);
  });

  it('loadCustomProvider loads default export class from local module', async () => {
    const tmpDir = path.join(__dirname, 'tmp-provider-layer');
    const providerFile = path.join(tmpDir, 'custom-provider.mjs');

    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      providerFile,
      `export default class CustomProvider {
        constructor(apiKey, model) {
          this.apiKey = apiKey;
          this.model = model;
        }
        async translateBatch(texts) {
          return texts;
        }
      }\n`,
      'utf8',
    );

    try {
      const provider = await loadCustomProvider(providerFile, 'api-key', 'm1');
      assert.equal(typeof provider.translateBatch, 'function');
      assert.equal(provider.apiKey, 'api-key');
      assert.equal(provider.model, 'm1');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('loadCustomProvider rejects modules without provider class default export', async () => {
    const tmpDir = path.join(__dirname, 'tmp-provider-layer-invalid');
    const providerFile = path.join(tmpDir, 'invalid-provider.mjs');

    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(providerFile, 'export default 123\n', 'utf8');

    try {
      await assert.rejects(
        () => loadCustomProvider(providerFile, 'api-key'),
        /must export a default class/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('loadCustomProvider rejects module paths outside current working directory', async () => {
    const outsideDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'iem-provider-'),
    );
    const providerFile = path.join(outsideDir, 'external-provider.mjs');
    await fs.writeFile(
      providerFile,
      `export default class ExternalProvider {
        async translateBatch(texts) {
          return texts;
        }
      }\n`,
      'utf8',
    );

    try {
      await assert.rejects(
        () => loadCustomProvider(providerFile, 'api-key'),
        /must resolve within the current working directory/,
      );
    } finally {
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it('loadCustomProvider rejects symlink paths that escape current working directory', async () => {
    const tmpDir = path.join(__dirname, 'tmp-provider-symlink');
    const outsideDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'iem-provider-'),
    );
    const providerFile = path.join(outsideDir, 'external-provider.mjs');
    const symlinkFile = path.join(tmpDir, 'provider-link.mjs');

    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      providerFile,
      `export default class ExternalProvider {
        async translateBatch(texts) {
          return texts;
        }
      }\n`,
      'utf8',
    );
    await fs.symlink(providerFile, symlinkFile);

    try {
      await assert.rejects(
        () => loadCustomProvider(symlinkFile, 'api-key'),
        /must resolve within the current working directory/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });
});
