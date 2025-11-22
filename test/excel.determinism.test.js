import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import ExcelJS from 'exceljs';

import { createTranslationWorksheet } from '../src/core/excel/sheetWrite.js';

describe('Excel determinism', () => {
  it('sorts keys and keeps language columns stable', () => {
    const wb = new ExcelJS.Workbook();
    const translations = new Map([
      ['b.key', { en: 'B', de: 'B' }],
      ['a.key', { en: 'A', de: 'A' }],
    ]);
    const languageCodes = ['de', 'en']; // intentionally unsorted order preserved
    createTranslationWorksheet(
      wb,
      'Translations',
      translations,
      languageCodes,
      { de: 'German', en: 'English' },
    );

    const ws = wb.getWorksheet('Translations');
    const headers = ws.getRow(1).values.slice(1);
    assert.deepEqual(headers, ['Key', 'German', 'English']);

    const row2 = ws.getRow(2).values.slice(1);
    const row3 = ws.getRow(3).values.slice(1);
    assert.equal(row2[0], 'a.key');
    assert.equal(row3[0], 'b.key');

    // Column positions must correspond to provided languageCodes order
    assert.equal(row2[1], 'A'); // de
    assert.equal(row2[2], 'A'); // en
  });
});
