import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertToExcelApp, convertToJsonApp } from '../src/app/convert.js';

function makeFakeIo() {
  const calls = { ensureDir: [], writeWorkbook: [], writeJson: [] };
  return {
    calls,
    checkFileExists: async () => {},
    ensureDirectoryExists: async (p) => {
      calls.ensureDir.push(p);
    },
    readDirJsonFiles: async () => [
      { name: 'de.json', data: { a: { b: 'Wert' }, c: 'Ja' } },
      { name: 'en.json', data: { a: { b: 'Value' }, c: 'Yes' } },
    ],
    readWorkbook: async (_path, workbook) => {
      const ws = workbook.addWorksheet('Translations');
      ws.addRow(['Key', 'de', 'en']);
      ws.addRow(['a.b', 'Wert', 'Value']);
      ws.addRow(['c', 'Ja', 'Yes']);
    },
    writeWorkbook: async (filePath, workbook) => {
      calls.writeWorkbook.push({ filePath, workbook });
    },
    writeJsonFile: async (filePath, data) => {
      calls.writeJson.push({ filePath, data });
    },
    dirname: (p) => {
      const idx = p.lastIndexOf('/');
      return idx === -1 ? '.' : p.slice(0, idx);
    },
  };
}

describe('app.convert', () => {
  it('convertToExcelApp: creates worksheet with mapped language headers', async () => {
    const io = makeFakeIo();
    const reporter = {
      print: () => {},
      warn: () => {},
    };
    await convertToExcelApp(
      io,
      '/in',
      '/out/x.xlsx',
      {
        sheetName: 'Translations',
        languageMap: { de: 'German', en: 'English' },
      },
      reporter,
    );

    assert.equal(io.calls.writeWorkbook.length, 1);
    const wb = io.calls.writeWorkbook[0].workbook;
    const ws = wb.getWorksheet('Translations');
    const headers = ws.getRow(1).values;
    assert.equal(headers[1], 'Key');
    assert.equal(headers[2], 'German');
    assert.equal(headers[3], 'English');
  });

  it('convertToExcelApp: dryRun with report does not write workbook', async () => {
    const io = makeFakeIo();
    let printed = false;
    const reporter = {
      print: () => {
        printed = true;
      },
      warn: () => {},
    };
    await convertToExcelApp(
      io,
      '/in',
      '/out/x.xlsx',
      { dryRun: true, report: true },
      reporter,
    );
    assert.equal(io.calls.writeWorkbook.length, 0);
    assert.equal(printed, true);
  });

  it('convertToJsonApp: writes JSON files from worksheet and validates duplicates', async () => {
    const io = makeFakeIo();
    const reporter = {
      print: () => {},
      warn: () => {},
    };
    await convertToJsonApp(
      io,
      '/in.xlsx',
      '/out',
      { sheetName: 'Translations' },
      reporter,
    );

    const written = io.calls.writeJson.toSorted((a, b) =>
      a.filePath.localeCompare(b.filePath),
    );
    assert.equal(written.length, 2);
    assert.equal(
      written[0].filePath.endsWith('/de.json') ||
        written[0].filePath.endsWith(String.raw`\de.json`),
      true,
    );
    assert.equal(
      written[1].filePath.endsWith('/en.json') ||
        written[1].filePath.endsWith(String.raw`\en.json`),
      true,
    );
    assert.equal(written[0].data.a.b, 'Wert');
    assert.equal(written[1].data.a.b, 'Value');
  });

  it('convertToJsonApp: throws when failOnDuplicates is true', async () => {
    const io = makeFakeIo();
    // override readWorkbook to introduce duplicates
    io.readWorkbook = async (_p, workbook) => {
      const ws = workbook.addWorksheet('Translations');
      ws.addRow(['Key', 'en']);
      ws.addRow(['dup.key', 'One']);
      ws.addRow(['dup.key', 'Two']);
    };
    const reporter = {
      print: () => {},
      warn: () => {},
    };
    let threw = false;
    try {
      await convertToJsonApp(
        io,
        '/in.xlsx',
        '/out',
        { failOnDuplicates: true },
        reporter,
      );
    } catch (e) {
      threw = true;
      assert.match(String(e.message), /Duplicate keys detected/);
    }
    assert.equal(threw, true);
  });
});
