import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertToJsonApp } from '../src/index.js';

function makeFakeIoFromWorkbook(build) {
  return {
    checkFileExists: async () => {},
    ensureDirectoryExists: async () => {},
    readWorkbook: async (_path, workbook) => {
      build(workbook);
    },
    writeJsonFile: async () => {},
  };
}

describe('Duplicate handling in convertToJsonApp', () => {
  it('warns on duplicates when failOnDuplicates is false', async () => {
    const io = makeFakeIoFromWorkbook((wb) => {
      const ws = wb.addWorksheet('Translations');
      ws.addRow(['Key', 'en']);
      ws.addRow(['dup.key', 'One']);
      ws.addRow(['dup.key', 'Two']);
    });
    let warned = '';
    const reporter = {
      print: () => {},
      warn: (m) => {
        warned += m;
      },
    };
    await convertToJsonApp(
      io,
      'in.xlsx',
      'out',
      { failOnDuplicates: false },
      reporter,
    );
    assert.match(warned, /Duplicate keys detected/);
  });

  it('throws on duplicates when failOnDuplicates is true', async () => {
    const io = makeFakeIoFromWorkbook((wb) => {
      const ws = wb.addWorksheet('Translations');
      ws.addRow(['Key', 'en']);
      ws.addRow(['dup.key', 'One']);
      ws.addRow(['dup.key', 'Two']);
    });
    const reporter = {
      print: () => {},
      warn: () => {},
    };
    await assert.rejects(
      () =>
        convertToJsonApp(
          io,
          'in.xlsx',
          'out',
          { failOnDuplicates: true },
          reporter,
        ),
      /Duplicate keys detected/,
    );
  });
});
