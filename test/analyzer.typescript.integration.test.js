/**
 * Integration test for TypeScript + Angular/ngx-translate analyzer.
 * Creates real-world Angular fixtures and verifies the analyzer correctly
 * detects keys from both TypeScript and HTML template files.
 * @module test/analyzer.typescript.integration
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractKeysFromCodebase } from '../src/core/analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('analyzer integration — TypeScript + Angular (ngx-translate)', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(__dirname, 'tmp-analyzer-ts-integration');
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    try {
      await fs.rm('.i18n-cache.json', { force: true });
    } catch {
      // Ignore if cache doesn't exist
    }
  });

  it('detects keys from TypeScript service with generics — real-world component', async () => {
    const componentTs = `
      import { Component, OnInit, inject, signal, WritableSignal } from '@angular/core';
      import { TranslateModule, TranslateService } from '@ngx-translate/core';
      import { Observable } from 'rxjs';

      @Component({
        selector: 'app-dashboard',
        imports: [TranslateModule],
        templateUrl: './dashboard.component.html',
        styleUrl: './dashboard.component.scss'
      })
      export class DashboardComponent implements OnInit {
        protected welcomeMessage$: Observable<string>;
        protected errorMessage: WritableSignal<string> = signal('');

        private readonly translate: TranslateService = inject(TranslateService);

        constructor() {
          // Typed service call — this would fail in old analyzer
          this.welcomeMessage$ = this.translate.get<string>('dashboard.welcome');
        }

        public ngOnInit(): void {
          // Multiple patterns from real code
          this.translate.instant<string>('dashboard.title');
          this.translate.get<Observable<string>>('dashboard.subtitle').subscribe(msg => {
            this.errorMessage.set(msg);
          });

          // Optional chaining variant (defensive)
          this.translate?.instant('dashboard.footer');

          // Generic service variable name
          const translateService = inject(TranslateService);
          translateService?.get<string>('dashboard.version');
        }

        public loadError(): void {
          // Backtick variant (uncommon but valid)
          const key = \`dashboard.error.\${Date.now()}\`;
          this.translate.instant(\`dashboard.error.generic\`);
        }

        private setupLanguage(): void {
          // These should NOT appear as keys (method names only)
          this.translate.use('en');
          this.translate.setDefaultLang('en');
          const lang = this.translate.getBrowserLang();
        }
      }
    `;

    const componentHtml = `
      <div class="dashboard">
        <!-- Template pipe syntax -->
        <h1>{{ 'dashboard.title' | translate }}</h1>

        <!-- Property binding with single quotes inside double -->
        <p [textContent]="'dashboard.subtitle' | translate"></p>

        <!-- Attribute directive -->
        <span translate="dashboard.version"></span>

        <!-- Property binding with literal -->
        <div [translate]="'dashboard.welcome'"></div>

        <!-- Structural directive -->
        <div *translate="'dashboard.footer'"></div>

        <!-- Bare property binding (without inner quotes) -->
        <button [translate]="'dashboard.action.submit'"></button>
      </div>
    `;

    // Write files
    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'dashboard.component.ts'),
      componentTs,
    );
    await fs.writeFile(
      path.join(srcDir, 'dashboard.component.html'),
      componentHtml,
    );

    // Extract keys using real glob pattern
    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.{ts,html}'),
    );

    // All keys should be detected despite TypeScript generics
    assert.ok(
      keys.has('dashboard.welcome'),
      'Should detect generics: get<string>()',
    );
    assert.ok(
      keys.has('dashboard.title'),
      'Should detect pipe syntax in template',
    );
    assert.ok(
      keys.has('dashboard.subtitle'),
      'Should detect nested generics: get<Observable<string>>()',
    );
    assert.ok(
      keys.has('dashboard.footer'),
      'Should detect optional chaining: translate?.instant()',
    );
    assert.ok(
      keys.has('dashboard.version'),
      'Should detect from both TS and template',
    );
    assert.ok(
      keys.has('dashboard.action.submit'),
      'Should detect property binding in template',
    );

    // Non-keys should NOT appear
    assert.ok(!keys.has('use'), 'translate.use() is not a key');
    assert.ok(!keys.has('setDefaultLang'), 'setDefaultLang() is not a key');
    assert.ok(!keys.has('getBrowserLang'), 'getBrowserLang() is not a key');

    // Backtick and dynamic keys edge cases
    assert.ok(
      keys.has('dashboard.error.generic'),
      'Should detect backtick template literals',
    );

    console.log(`Detected ${keys.size} keys from fixture`);
  });

  it('handles mixed TypeScript (.ts) and HTML (.html) files correctly', async () => {
    const serviceTs = `
      import { Injectable, inject } from '@angular/core';
      import { TranslateService } from '@ngx-translate/core';
      import { Observable } from 'rxjs';

      @Injectable({ providedIn: 'root' })
      export class I18nService {
        private readonly translate: TranslateService = inject(TranslateService);

        public getWelcome(): Observable<string> {
          return this.translate.get<string>('service.welcome');
        }

        public getError(): Observable<string> {
          return this.translate.stream<string>('service.error');
        }
      }
    `;

    const templateHtml = `
      <section>
        <p>{{ 'template.header' | translate }}</p>
        <button [translate]="'template.submit'"></button>
      </section>
    `;

    const srcDir = path.join(tmpDir, 'src', 'app');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'i18n.service.ts'), serviceTs);
    await fs.writeFile(path.join(srcDir, 'shared.html'), templateHtml);

    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.{ts,html}'),
    );

    assert.ok(keys.has('service.welcome'), 'TS get<string>() detected');
    assert.ok(keys.has('service.error'), 'TS stream<string>() detected');
    assert.ok(keys.has('template.header'), 'Template pipe detected');
    assert.ok(keys.has('template.submit'), 'Template binding detected');
    assert.equal(keys.size, 4, 'Exactly 4 keys from mixed files');
  });

  it('uses cache correctly and detects version mismatch', async () => {
    const simpleTs = `
      this.translate.get<string>('cache.test');
    `;

    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    const testFile = path.join(srcDir, 'test.ts');
    await fs.writeFile(testFile, simpleTs);

    // First run with cache enabled
    let keys = await extractKeysFromCodebase(path.join(tmpDir, 'src/**/*.ts'), {
      useCache: true,
    });
    assert.ok(keys.has('cache.test'), 'First extraction should find key');

    // Read cache file and verify it has version field
    const cachePath = '.i18n-cache.json';
    const cacheContent = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    const cacheEntry = cacheContent[testFile];
    assert.ok(cacheEntry, 'Cache entry should exist for test file');
    assert.match(
      String(cacheEntry.v),
      /^\d+$/,
      'Cache entry should have a numeric version marker',
    );
    assert.ok(cacheEntry.hash, 'Cache entry should have content hash');
    assert.equal(
      typeof cacheEntry.sig,
      'string',
      'Cache entry should include extractor signature',
    );
    assert.ok(
      Array.isArray(cacheEntry.keys),
      'Cache entry should have keys array',
    );

    // Modify file — second run should re-extract despite cache
    const modifiedTs = `
      this.translate.get<string>('cache.test');
      this.translate.instant<string>('cache.new');
    `;
    await fs.writeFile(testFile, modifiedTs);

    keys = await extractKeysFromCodebase(path.join(tmpDir, 'src/**/*.ts'), {
      useCache: true,
    });
    assert.ok(
      keys.has('cache.test'),
      'Modified extraction should find original key',
    );
    assert.ok(keys.has('cache.new'), 'Modified extraction should find new key');

    // Verify cache was updated
    const updatedCache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    const updatedEntry = updatedCache[testFile];
    assert.notEqual(
      updatedEntry.hash,
      cacheEntry.hash,
      'Cache hash should change after file modification',
    );
    assert.equal(updatedEntry.v, cacheEntry.v, 'Version field should persist');
    assert.equal(
      updatedEntry.sig,
      cacheEntry.sig,
      'Extractor signature should persist for same extraction settings',
    );
  });

  it('handles edge case: marker() helper for table-driven i18n', async () => {
    const tableComponentTs = `
      import { marker } from '@biesbjerg/ngx-translate-extract-marker';

      export const COLUMN_DEFINITIONS = [
        { header: marker('table.column.name'), field: 'name' },
        { header: marker("table.column.email"), field: 'email' },
        { header: marker(\`table.column.status\`), field: 'status' },
      ];

      export class TableComponent {
        columns = COLUMN_DEFINITIONS;
      }
    `;

    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'table.component.ts'),
      tableComponentTs,
    );

    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.ts'),
    );

    assert.ok(
      keys.has('table.column.name'),
      'marker() with single quotes should be detected',
    );
    assert.ok(
      keys.has('table.column.email'),
      'marker() with double quotes should be detected',
    );
    assert.ok(
      keys.has('table.column.status'),
      'marker() with backticks should be detected',
    );
    assert.equal(keys.size, 3, 'Exactly 3 marker keys');
  });

  it('warns about regex limitations: matches inside comments and strings (known limitation)', async () => {
    // Regex-based extraction has known limitations: it matches literal strings
    // inside comments and template strings. This is acceptable because:
    // 1. Comments are removed by minifiers in production
    // 2. Keys in string literals are rare (99.9% of cases are live calls)
    // 3. False positives are less harmful than false negatives (missing keys)
    // 4. Full AST parsing would add significant overhead
    //
    // This test documents the limitation explicitly so users understand the tradeoff.

    const noiseTs = `
      // Should match (regex limitation — but acceptable)
      const readme = 'this.translate.instant("README.KEY")';
      const html = \`<div translate="HTML_IN_STRING"></div>\`;

      // Should NOT match — different method names
      const result = this.translate.use('en');
      const lang = this.translate.getBrowserLang();
      this.translate.setDefaultLang('de');

      // Should NOT match — not a string literal or different object
      const key = userInput;
      this.translate.instant(key);
      const result = this.other.instant('FAKE.KEY');
      const msg = dataService.get('DATA.KEY');
    `;

    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'noise.ts'), noiseTs);

    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.ts'),
    );

    // Due to regex-based extraction matching inside string literals,
    // README.KEY and HTML_IN_STRING will be detected.
    // This is a known limitation that's acceptable for the benefit of simplicity.
    assert.ok(
      keys.has('README.KEY'),
      'Regex limitation: matches inside double-quoted string',
    );
    assert.ok(
      keys.has('HTML_IN_STRING'),
      'Regex limitation: matches inside template literal string',
    );

    // But non-key methods should still NOT appear
    assert.ok(!keys.has('use'), 'use() should not be detected');
    assert.ok(
      !keys.has('setDefaultLang'),
      'setDefaultLang() should not be detected',
    );
    assert.ok(
      !keys.has('getBrowserLang'),
      'getBrowserLang() should not be detected',
    );

    console.log(
      `  (Regex extracted ${keys.size} keys — 2 are expected false positives from string content)`,
    );
  });

  it('end-to-end CLI simulation: analyze command discovers all TypeScript keys', async () => {
    // Create a realistic multi-file Angular 20+ project structure
    const appConfigTs = `
      import { ApplicationConfig } from '@angular/core';
      import { provideHttpClient, withFetch } from '@angular/common/http';
      import { provideTranslateService, TranslatePipe } from '@ngx-translate/core';
      import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

      export const appConfig: ApplicationConfig = {
        providers: [
          provideHttpClient(withFetch()),
          provideTranslateService({
            loader: provideTranslateHttpLoader({
              prefix: './assets/i18n/',
              suffix: '.json',
            }),
            fallbackLang: 'en',
            lang: 'en',
          }),
        ],
      };
    `;

    const headerComponentTs = `
      import { Component, inject, OnInit, signal } from '@angular/core';
      import { TranslateService, TranslatePipe } from '@ngx-translate/core';

      @Component({
        selector: 'app-header',
        imports: [TranslatePipe],
        template: \`
          <header>
            <h1>{{ 'app.header.title' | translate }}</h1>
            <p>{{ 'app.header.welcome' | translate: { name: userName() } }}</p>
            <button (click)="switchLanguage('en')">{{ 'app.language.english' | translate }}</button>
            <button (click)="switchLanguage('de')">{{ 'app.language.deutsch' | translate }}</button>
          </header>
        \`
      })
      export class HeaderComponent implements OnInit {
        private readonly translate: TranslateService = inject(TranslateService);

        protected userName = signal('User');

        public ngOnInit(): void {
          this.translate.get<string>('app.header.title').subscribe();
        }

        public switchLanguage(lang: string): void {
          this.translate.use(lang);
        }
      }
    `;

    const headerComponentHtml = `
      <header>
        <h1>{{ 'app.header.title' | translate }}</h1>
        <p>{{ 'app.header.welcome' | translate: { name: 'John' } }}</p>
        <nav>
          <button [translate]="'app.header.logout'" (click)="switchLanguage('en')"></button>
          <span [attr.aria-label]="'app.header.language' | translate"></span>
        </nav>
      </header>
    `;

    const footerComponentHtml = `
      <footer [translate]="'app.footer.copyright'"></footer>
    `;

    const mainHtml = `
      <app-header></app-header>
      <main translate="app.main.content"></main>
      <app-footer></app-footer>
    `;

    const srcDir = path.join(tmpDir, 'src', 'app');
    await fs.mkdir(path.join(srcDir, 'components'), { recursive: true });
    await fs.writeFile(path.join(srcDir, 'app.config.ts'), appConfigTs);
    await fs.writeFile(
      path.join(srcDir, 'components', 'header.component.ts'),
      headerComponentTs,
    );
    await fs.writeFile(
      path.join(srcDir, 'components', 'header.component.html'),
      headerComponentHtml,
    );
    await fs.writeFile(
      path.join(srcDir, 'components', 'footer.component.html'),
      footerComponentHtml,
    );
    await fs.writeFile(path.join(srcDir, 'main.html'), mainHtml);

    // Simulate CLI analyze default pattern: '**/*.{html,ts,js}'
    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.{html,ts,js}'),
    );

    // Verify all keys are found
    const expectedKeys = [
      'app.header.title',
      'app.header.welcome',
      'app.header.logout',
      'app.header.language',
      'app.language.english',
      'app.language.deutsch',
      'app.footer.copyright',
      'app.main.content',
    ];

    for (const key of expectedKeys) {
      assert.ok(keys.has(key), `Should detect key: ${key}`);
    }
    assert.equal(
      keys.size,
      expectedKeys.length,
      'Should detect exactly the expected keys',
    );
  });

  it('handles real-world edge case: typed generic parameters with union types', async () => {
    const unionTs = `
      import { Component, inject } from '@angular/core';
      import { TranslateService } from '@ngx-translate/core';
      import { Observable } from 'rxjs';

      @Component({
        selector: 'app-advanced',
        template: ''
      })
      export class AdvancedComponent {
        private readonly translate: TranslateService = inject(TranslateService);

        constructor() {
          // Complex generic: union of Observable and string
          const message: Observable<string> | string = 
            this.translate.get<Observable<string> | string>('complex.union');

          // Nested with constraints-style syntax (TypeScript 4.7+)
          this.translate.get<{result: string, error?: string}>('complex.object');

          // Multi-level nesting
          this.translate.stream<Map<string, Set<Observable<string>>>>('complex.map');
        }
      }
    `;

    const srcDir = path.join(tmpDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'advanced.ts'), unionTs);

    const keys = await extractKeysFromCodebase(
      path.join(tmpDir, 'src/**/*.ts'),
    );

    assert.ok(keys.has('complex.union'), 'Should handle union type generics');
    assert.ok(keys.has('complex.object'), 'Should handle object type generics');
    assert.ok(
      keys.has('complex.map'),
      'Should handle multi-level nested generics',
    );
    assert.equal(keys.size, 3, 'All complex generic variants detected');
  });
});
