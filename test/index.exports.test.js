import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('index exports', async () => {
  it('exposes advanced exports and helpers', async () => {
    const m = await import('../src/index.js');
    assert.equal(typeof m.convertToExcelApp, 'function');
    assert.equal(typeof m.convertToJsonApp, 'function');
    assert.equal(typeof m.consoleReporter, 'object');
    assert.equal(typeof m.jsonFileReporter, 'function');
    assert.equal(typeof m.loadValidatedConfig, 'function');
    assert.equal(typeof m.analyzeApp, 'function');
  });

  it('analyze function propagates errors correctly', async () => {
    const m = await import('../src/index.js');

    await assert.rejects(async () => {
      await m.analyze({
        sourcePath: '/nonexistent/path/xyz',
        codePattern: '**/*.ts',
      });
    }, /Could not read i18n files/);
  });

  it('translate function validates required options', async () => {
    const m = await import('../src/index.js');

    await assert.rejects(async () => {
      await m.translate({
        input: '',
        apiKey: 'test',
      });
    }, /must be a non-empty string/);
  });

  it('analyze function works with valid inputs', async () => {
    const m = await import('../src/index.js');
    const tmpDir = path.join(__dirname, 'tmp-index-test');

    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'en.json'),
        JSON.stringify({ key: 'value' }),
        'utf8',
      );

      const result = await m.analyze({
        sourcePath: tmpDir,
        codePattern: path.join(tmpDir, '**/*.ts'),
      });

      assert.ok(result.totalCodeKeys !== undefined);
      assert.ok(result.fileReports !== undefined);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('exportedApp functions are accessible', async () => {
    const m = await import('../src/index.js');
    assert.equal(typeof m.createReverseLanguageMap, 'function');
    assert.equal(typeof m.generateDefaultLanguageMap, 'function');
  });
});
