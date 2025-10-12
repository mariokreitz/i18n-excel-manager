import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import ExcelJS from 'exceljs';

import { createTranslationWorksheet } from '../src/core/excel/sheetWrite.js';

describe('core/excel/sheetWrite styles', () => {
  it('applies header styles and column widths', () => {
    const wb = new ExcelJS.Workbook();
    const translations = new Map([['a', { en: 'A' }]]);
    const ws = createTranslationWorksheet(
      wb,
      'Translations',
      translations,
      ['en'],
      { en: 'English' },
    );

    // Header font bold
    const header = ws.getRow(1);
    assert.equal(header.font?.bold, true);
    // Fill pattern
    assert.equal(header.fill?.type, 'pattern');
    assert.equal(header.fill?.pattern, 'solid');
    assert.equal(header.fill?.fgColor?.argb, 'FFD3D3D3');
    // Column width
    for (const col of ws.columns) {
      assert.equal(col.width, 40);
    }
  });
});
