import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

import { readWorkbook, writeWorkbook } from '../src/io/excel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP = path.join(__dirname, 'tmp-io-excel');

describe('io/excel wrappers', () => {
  beforeEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
    await fs.mkdir(TMP, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
  });

  it('writeWorkbook then readWorkbook roundtrip', async () => {
    const file = path.join(TMP, 'roundtrip.xlsx');
    const wbWrite = new ExcelJS.Workbook();
    const ws = wbWrite.addWorksheet('Translations');
    ws.addRow(['Key', 'en']);
    ws.addRow(['hello', 'Hello']);
    await writeWorkbook(file, wbWrite);

    const wbRead = new ExcelJS.Workbook();
    await readWorkbook(file, wbRead);
    const wsRead = wbRead.getWorksheet('Translations');
    assert.ok(wsRead, 'worksheet should exist after read');
    const row2 = wsRead.getRow(2).values.slice(1);
    assert.deepEqual(row2, ['hello', 'Hello']);
  });
});
