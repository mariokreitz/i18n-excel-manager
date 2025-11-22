import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCommonOptions,
  resolveExcelToI18nPaths,
  resolveFailOnDuplicates,
  resolveI18nToExcelPaths,
} from '../src/cli/params.js';

describe('CLI params branch coverage', () => {
  const defaults = {
    sourcePath: 'src-i18n',
    targetFile: 'out.xlsx',
    targetPath: 'dist-i18n',
    sheetName: 'Translations',
  };

  it('resolveI18nToExcelPaths prefers input > sourcePath > defaults > empty', () => {
    // input provided
    let r = resolveI18nToExcelPaths({ input: 'A', output: 'B' }, defaults);
    assert.deepEqual(r, { sourcePath: 'A', targetFile: 'B' });

    // sourcePath fallback
    r = resolveI18nToExcelPaths({ sourcePath: 'C', targetFile: 'D' }, defaults);
    assert.deepEqual(r, { sourcePath: 'C', targetFile: 'D' });

    // defaults fallback
    r = resolveI18nToExcelPaths({}, defaults);
    assert.deepEqual(r, { sourcePath: 'src-i18n', targetFile: 'out.xlsx' });

    // empty when no defaults
    r = resolveI18nToExcelPaths({}, {});
    assert.deepEqual(r, { sourcePath: '', targetFile: '' });
  });

  it('resolveExcelToI18nPaths prefers input > targetFile > defaults; and output > targetPath > defaults', () => {
    // input and output provided
    let r = resolveExcelToI18nPaths(
      { input: 'in.xlsx', output: 'dir' },
      defaults,
    );
    assert.deepEqual(r, { sourceFile: 'in.xlsx', targetPath: 'dir' });

    // fallback to targetFile when input missing
    r = resolveExcelToI18nPaths(
      { targetFile: 'tf.xlsx', targetPath: 'tp' },
      defaults,
    );
    assert.deepEqual(r, { sourceFile: 'tf.xlsx', targetPath: 'tp' });

    // defaults when none provided
    r = resolveExcelToI18nPaths({}, defaults);
    assert.deepEqual(r, { sourceFile: 'out.xlsx', targetPath: 'dist-i18n' });

    // empty when no defaults
    r = resolveExcelToI18nPaths({}, {});
    assert.deepEqual(r, { sourceFile: '', targetPath: '' });
  });

  it('buildCommonOptions resolves sheetName and languageMap with precedence; includes report only when present', () => {
    // options provide sheetName, languageMap and report
    let out = buildCommonOptions(
      { sheetName: 'S', languageMap: { en: 'English' }, report: false },
      {},
      { languages: { de: 'German' } },
      true,
    );
    assert.equal(out.sheetName, 'S');
    assert.deepEqual(out.languageMap, { en: 'English' });
    assert.equal(out.dryRun, true);
    assert.equal(out.report, false);

    // fallback sheetName from defaults; languageMap from runtimeConfig
    out = buildCommonOptions(
      {},
      { sheetName: 'D' },
      { languages: { fr: 'French' } },
      false,
    );
    assert.equal(out.sheetName, 'D');
    assert.deepEqual(out.languageMap, { fr: 'French' });
    assert.equal(out.dryRun, false);
    // report omitted when not in options
    assert.ok(!('report' in out));

    // fallback to default "Translations" when none provided anywhere
    out = buildCommonOptions({}, {}, {}, false);
    assert.equal(out.sheetName, 'Translations');
    assert.ok(!('languageMap' in out));
  });

  it('resolveFailOnDuplicates handles options flag and argv presence', () => {
    // options true wins
    let res = resolveFailOnDuplicates(
      { failOnDuplicates: true },
      [],
      '--fail-on-duplicates',
    );
    assert.equal(res, true);

    // argv contains flag
    res = resolveFailOnDuplicates(
      {},
      ['node', 'cli', '--fail-on-duplicates'],
      '--fail-on-duplicates',
    );
    assert.equal(res, true);

    // false case
    res = resolveFailOnDuplicates(
      { failOnDuplicates: false },
      ['node', 'cli'],
      '--fail-on-duplicates',
    );
    assert.equal(res, false);

    // argv undefined
    res = resolveFailOnDuplicates({}, undefined, '--fail-on-duplicates');
    assert.equal(res, false);
  });
});
