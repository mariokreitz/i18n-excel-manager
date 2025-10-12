import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertToExcelApp, convertToJsonApp } from '../src/app/convert.js';

function baseIo() {
  return {
    checkFileExists: async () => {},
    ensureDirectoryExists: async () => {},
    readDirJsonFiles: async () => [],
    readWorkbook: async () => {},
    writeWorkbook: async () => {},
    writeJsonFile: async () => {},
    dirname: (p) => p,
  };
}

describe('app.convert errors', () => {
  it('convertToExcelApp throws if no JSON files in directory', async () => {
    const io = baseIo();
    await assert.rejects(
      () => convertToExcelApp(io, '/empty', '/out.xlsx'),
      /No JSON files found/,
    );
  });

  it('convertToJsonApp throws if worksheet not found', async () => {
    const io = baseIo();
    // Provide readWorkbook that does not create the expected worksheet
    io.readWorkbook = async (_p, wb) => {
      void wb;
    };
    await assert.rejects(
      () =>
        convertToJsonApp(io, '/in.xlsx', '/out', { sheetName: 'Translations' }),
      /Worksheet "Translations" not found/,
    );
  });
});
