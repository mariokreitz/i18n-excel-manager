import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import ExcelJS from 'exceljs';

import { readTranslationsFromWorksheet } from '../src/core/excel/sheetRead.js';

describe('Header validation', () => {
  it('throws on empty language header', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'en', '']);
    ws.addRow(['a', 'A', '']);
    assert.throws(
      () => readTranslationsFromWorksheet(ws, {}),
      /Empty language header at column 3/,
    );
  });

  it('throws on duplicate language columns after mapping', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Translations');
    ws.addRow(['Key', 'de', 'German']);
    ws.addRow(['a', 'Wert', 'Wert']);
    const languageMap = { de: 'German' };
    assert.throws(
      () => readTranslationsFromWorksheet(ws, languageMap),
      /Duplicate language columns for code "de"/,
    );
  });
});
