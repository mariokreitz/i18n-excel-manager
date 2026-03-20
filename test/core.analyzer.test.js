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

    // ── TypeScript-specific patterns (Angular / ngx-translate) ───────────────

    it('extracts keys from TypeScript generic calls: translate.get<string>()', () => {
      const content = `
        this.translate.get<string>('GENERIC.SIMPLE');
        this.translate.instant<string>('GENERIC.INSTANT');
        this.translate.stream<boolean>('GENERIC.STREAM');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'GENERIC.INSTANT',
        'GENERIC.SIMPLE',
        'GENERIC.STREAM',
      ]);
    });

    it('extracts keys from TypeScript nested generics: translate.get<Observable<string>>()', () => {
      const content = `
        this.translate.get<Observable<string>>('NESTED.GENERIC');
        this.translate.get<Map<string, unknown>>('NESTED.MAP');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), ['NESTED.GENERIC', 'NESTED.MAP']);
    });

    it('extracts keys from translateService variable name', () => {
      const content = `
        this.translateService.instant('SERVICE.KEY1');
        this.translateService.get('SERVICE.KEY2');
        translateService.stream('SERVICE.KEY3');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'SERVICE.KEY1',
        'SERVICE.KEY2',
        'SERVICE.KEY3',
      ]);
    });

    it('extracts keys from optional chaining: translate?.instant()', () => {
      const content = `
        this.translate?.instant('OPTIONAL.KEY');
        this.translateService?.get('OPTIONAL.SERVICE');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'OPTIONAL.KEY',
        'OPTIONAL.SERVICE',
      ]);
    });

    it('extracts keys from backtick template literal strings', () => {
      // Template literal keys are uncommon but valid TypeScript
      const content = 'this.translate.instant(`BACKTICK.KEY`)';
      const keys = extractKeysFromContent(content);
      assert.ok(
        keys.has('BACKTICK.KEY'),
        'Should detect backtick template literal key',
      );
    });

    it('extracts key but ignores extra arguments: translate.instant(key, params)', () => {
      const content = `
        this.translate.instant('PARAM.KEY', { name: 'Alice', count: 3 });
      `;
      const keys = extractKeysFromContent(content);
      assert.ok(
        keys.has('PARAM.KEY'),
        'Should capture key regardless of extra params arg',
      );
    });

    it('extracts keys from translate calls without this.', () => {
      const content = `
        translate.instant('NO_THIS.KEY');
        translate.get<string>('NO_THIS.GENERIC');
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'NO_THIS.GENERIC',
        'NO_THIS.KEY',
      ]);
    });

    it('extracts keys from marker() helper function', () => {
      const content = `
        import { marker } from '@biesbjerg/ngx-translate-extract-marker';
        marker('MARKER.KEY1');
        marker("MARKER.KEY2");
        marker(\`MARKER.KEY3\`);
      `;
      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'MARKER.KEY1',
        'MARKER.KEY2',
        'MARKER.KEY3',
      ]);
    });

    it('extracts keys from metadata key fields (titleKey/descriptionKey)', () => {
      const content = `
        {
          path: 'home',
          data: {
            titleKey: 'PAGE.HOME_TITLE',
            descriptionKey: 'PAGE.HOME_DESCRIPTION'
          }
        }
      `;

      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'PAGE.HOME_DESCRIPTION',
        'PAGE.HOME_TITLE',
      ]);
    });

    it('supports configurable metadata key field names', () => {
      const content = `
        {
          data: {
            subtitleToken: 'PAGE.CUSTOM_SUBTITLE'
          }
        }
      `;

      const withoutCustomFields = extractKeysFromContent(content);
      assert.equal(
        withoutCustomFields.has('PAGE.CUSTOM_SUBTITLE'),
        false,
        'Should not extract unknown metadata field by default',
      );

      const withCustomFields = extractKeysFromContent(content, {
        metadataKeyFields: ['subtitleToken'],
      });
      assert.equal(
        withCustomFields.has('PAGE.CUSTOM_SUBTITLE'),
        true,
        'Should extract key from configured metadata field',
      );
    });

    it('allows disabling metadata-key extraction via empty metadataKeyFields', () => {
      const content = `
        {
          data: {
            titleKey: 'PAGE.DISABLED_TITLE'
          }
        }
      `;

      const keys = extractKeysFromContent(content, { metadataKeyFields: [] });
      assert.equal(
        keys.has('PAGE.DISABLED_TITLE'),
        false,
        'Explicit empty metadata list should disable metadata extraction',
      );
    });

    it('extracts keys from const literal arrays used via map callback translate calls', () => {
      const content = `
        const loaderKeys = ['LOADER.TITLES.TITLE_1', 'LOADER.TITLES.TITLE_2'] as const;
        loaderKeys.map((key) => this.translate.instant(key));
      `;

      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), [
        'LOADER.TITLES.TITLE_1',
        'LOADER.TITLES.TITLE_2',
      ]);
    });

    it('extracts keys from const literal arrays used directly in translate calls', () => {
      const content = `
        const alertKeys = ['ALERT.OK', 'ALERT.CANCEL'];
        this.translate.get(alertKeys);
      `;

      const keys = extractKeysFromContent(content);
      assert.deepEqual([...keys].toSorted(), ['ALERT.CANCEL', 'ALERT.OK']);
    });

    it('does not extract non-key service calls (use, setDefaultLang, getBrowserLang)', () => {
      const content = `
        this.translate.use('en');
        this.translate.setDefaultLang('de');
        this.translate.getBrowserLang();
      `;
      const keys = extractKeysFromContent(content);
      assert.equal(
        keys.size,
        0,
        'use/setDefaultLang/getBrowserLang are not i18n keys',
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

    it('supports multiple glob patterns for monorepo-style scanning', async () => {
      const appDir = path.join(tmpDir, 'apps', 'web', 'src');
      const sharedDir = path.join(tmpDir, 'packages', 'shared', 'src');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(sharedDir, { recursive: true });

      await fs.writeFile(
        path.join(appDir, 'app.component.ts'),
        "this.translate.instant('APP.ONLY.KEY')",
        'utf8',
      );
      await fs.writeFile(
        path.join(sharedDir, 'shared.component.ts'),
        "this.translate.instant('SHARED.ONLY.KEY')",
        'utf8',
      );

      const keys = await extractKeysFromCodebase([
        path.join(tmpDir, 'apps/web/src/**/*.ts'),
        path.join(tmpDir, 'packages/shared/src/**/*.ts'),
      ]);

      assert.deepEqual([...keys].toSorted(), [
        'APP.ONLY.KEY',
        'SHARED.ONLY.KEY',
      ]);
    });

    it('returns empty set for blank string patterns', async () => {
      const keys = await extractKeysFromCodebase('   ');
      assert.equal(keys.size, 0);
    });

    it('returns empty set for invalid non-string/non-array patterns', async () => {
      const keys = await extractKeysFromCodebase(/** @type {any} */ (123));
      assert.equal(keys.size, 0);
    });
  });
});
