import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('index exports', async () => {
  it('exposes advanced exports and helpers', async () => {
    const m = await import('../src/index.js');
    assert.equal(typeof m.convertToExcelApp, 'function');
    assert.equal(typeof m.convertToJsonApp, 'function');
    assert.equal(typeof m.consoleReporter, 'object');
    assert.equal(typeof m.jsonFileReporter, 'function');
    assert.equal(typeof m.loadValidatedConfig, 'function');
  });
});
