import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  analyzeKeys,
  extractKeysFromCodebase,
  extractKeysFromContent,
  flattenKeys,
} from '../src/core/analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    it('extracts keys from [translate]="KEY" bare form', () => {
      const content = `
        <div [translate]="TITLE.BARE"></div>
      `;
      const keys = extractKeysFromContent(content);
      assert.ok(
        keys.has('TITLE.BARE'),
        '[translate]="KEY" bare form should match',
      );
    });

    it('extracts keys from *translate="KEY" bare form', () => {
      const content = `
        <span *translate="TITLE.BARE2"></span>
      `;
      const keys = extractKeysFromContent(content);
      assert.ok(
        keys.has('TITLE.BARE2'),
        '*translate="KEY" bare form should match',
      );
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

  describe('extractKeysFromCodebase', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = path.join(__dirname, 'tmp-analyzer');
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('warns on unreadable files and returns keys from readable files', async () => {
      // Create one valid file and one unreadable file
      const validFile = path.join(tmpDir, 'valid.ts');
      await fs.writeFile(validFile, "'FOUND.KEY' | translate", 'utf8');

      const unreadableFile = path.join(tmpDir, 'unreadable.ts');
      await fs.writeFile(unreadableFile, 'content', 'utf8');
      await fs.chmod(unreadableFile, 0o000);

      const origWarn = console.warn;
      let warnOutput = '';
      console.warn = (msg = '', ...rest) => {
        warnOutput +=
          String(msg) + (rest.length > 0 ? ' ' + rest.join(' ') : '') + '\n';
      };

      try {
        const keys = await extractKeysFromCodebase(
          path.join(tmpDir, '**/*.ts'),
        );
        assert.ok(keys.has('FOUND.KEY'), 'Should have keys from readable file');
        assert.match(warnOutput, /\[analyzer\] Warning:.*unreadable\.ts/);
      } finally {
        console.warn = origWarn;
        // Restore permissions so cleanup can delete the file
        await fs.chmod(unreadableFile, 0o644);
      }
    });
  });
});
