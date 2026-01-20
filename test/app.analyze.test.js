import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeApp } from '../src/app/analyze.js';

function makeFakeIo(files = []) {
  return {
    readDirJsonFiles: async () => files,
    checkFileExists: async () => {},
    ensureDirectoryExists: async () => {},
  };
}

const makeMockExtractKeys = (expectedPattern, returnKeys) => async (sc) => {
  if (expectedPattern) assert.equal(sc, expectedPattern);
  return returnKeys;
};

describe('app/analyze', () => {
  it('analyzeApp: correctly orchestrates analysis', async () => {
    // Mock IO returning one JSON file
    const io = makeFakeIo([
      { name: 'en.json', data: { 'KEY.USED': 'val', 'KEY.UNUSED': 'val' } },
    ]);

    // Mock extraction finding certain keys
    const mockExtractKeys = makeMockExtractKeys(
      'pattern/**/*.ts',
      new Set(['KEY.USED', 'KEY.MISSING']),
    );

    const report = await analyzeApp(
      io,
      { sourcePath: '/i18n', codePattern: 'pattern/**/*.ts' },
      { extractKeys: mockExtractKeys },
    );

    assert.equal(report.totalCodeKeys, 2);

    // Check report for en.json
    const enReport = report.fileReports['en.json'];
    assert.deepEqual(enReport.missing, ['KEY.MISSING']);
    assert.deepEqual(enReport.unused, ['KEY.UNUSED']);
  });

  it('analyzeApp: throws if no JSON files found', async () => {
    const io = makeFakeIo([]); // Empty
    const mockExtractKeys = makeMockExtractKeys(null, new Set());

    await assert.rejects(async () => {
      await analyzeApp(
        io,
        { sourcePath: '/i18n', codePattern: '*' },
        { extractKeys: mockExtractKeys },
      );
    }, /No JSON files found/);
  });

  it('analyzeApp: integration test with nested keys', async () => {
    const io = makeFakeIo([
      { name: 'de.json', data: { A: { B: 'val' }, C: 'val' } },
    ]);
    const mockExtractKeys = makeMockExtractKeys(null, new Set(['A.B', 'D']));

    const report = await analyzeApp(
      io,
      { sourcePath: '/i18n', codePattern: '*' },
      { extractKeys: mockExtractKeys },
    );

    const deReport = report.fileReports['de.json'];
    // code has A.B (found), D (missing in json)
    // json has A.B (used), C (unused in code)
    assert.deepEqual(deReport.missing, ['D']);
    assert.deepEqual(deReport.unused, ['C']);
  });

  it('analyzeApp: throws descriptive error when readDirJsonFiles fails', async () => {
    const io = {
      readDirJsonFiles: async () => {
        throw new Error('Permission denied');
      },
    };
    const mockExtractKeys = makeMockExtractKeys(null, new Set());

    await assert.rejects(async () => {
      await analyzeApp(
        io,
        { sourcePath: '/restricted', codePattern: '*' },
        { extractKeys: mockExtractKeys },
      );
    }, /Could not read i18n files from \/restricted: Permission denied/);
  });

  it('analyzeApp: handles empty codebase (no keys found)', async () => {
    const io = makeFakeIo([{ name: 'en.json', data: { KEY: 'val' } }]);
    const mockExtractKeys = makeMockExtractKeys(null, new Set());

    const report = await analyzeApp(
      io,
      { sourcePath: '/i18n', codePattern: '*' },
      { extractKeys: mockExtractKeys },
    );

    assert.equal(report.totalCodeKeys, 0);
    const enReport = report.fileReports['en.json'];
    assert.deepEqual(enReport.missing, []);
    assert.deepEqual(enReport.unused, ['KEY']);
  });
});
