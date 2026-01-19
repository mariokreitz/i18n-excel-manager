import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractKeysFromContent,
  flattenKeys,
  analyzeKeys,
} from '../src/core/analyzer.js';

describe('core/analyzer', () => {
  describe('extractKeysFromContent', () => {
    it('extracts keys from Angular pipes', () => {
      const content = `
        <p>{{ 'HELLO.WORLD' | translate }}</p>
        <span [title]="'BUTTON.SAVE' | translate"></span>
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), ['BUTTON.SAVE', 'HELLO.WORLD']);
    });

    it('extracts keys from TranslateService calls', () => {
      const content = `
        this.translate.get('MSG.SUCCESS');
        this.translate.instant("MSG.ERROR");
        this.translate.stream('MSG.LOADING');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'MSG.ERROR',
        'MSG.LOADING',
        'MSG.SUCCESS',
      ]);
    });

    it('extracts keys from Directives', () => {
      const content = `
        <div translate="TITLE.MAIN"></div>
        <div [translate]="'TITLE.SUB'"></div>
        <div *translate="'TITLE.EXTRA'"></div>
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'TITLE.EXTRA',
        'TITLE.MAIN',
        'TITLE.SUB',
      ]);
    });
  });

  describe('flattenKeys', () => {
    it('flattens nested objects to dot notation', () => {
      const obj = {
        A: 'val',
        B: {
          C: 'val',
          D: {
            E: 'val',
          },
        },
      };
      const keys = flattenKeys(obj);
      assert.deepEqual([...keys].toSorted(), ['A', 'B.C', 'B.D.E']);
    });
  });

  describe('analyzeKeys', () => {
    it('identifies missing and unused keys', () => {
      const codeKeys = new Set(['USED.KEY', 'MISSING.KEY']);
      const jsonKeys = new Set(['USED.KEY', 'UNUSED.KEY']);

      const result = analyzeKeys(codeKeys, jsonKeys);

      assert.deepEqual(result.missing, ['MISSING.KEY']);
      assert.deepEqual(result.unused, ['UNUSED.KEY']);
    });

    it('returns empty arrays when perfectly matched', () => {
      const codeKeys = new Set(['KEY1', 'KEY2']);
      const jsonKeys = new Set(['KEY1', 'KEY2']);

      const result = analyzeKeys(codeKeys, jsonKeys);

      assert.deepEqual(result.missing, []);
      assert.deepEqual(result.unused, []);
    });
  });
});
