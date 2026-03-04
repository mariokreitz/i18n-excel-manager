import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createReverseLanguageMap,
  generateDefaultLanguageMap,
} from '../src/index.js';

describe('core/languages/mapping', () => {
  it('creates reverse map from code->name to name->code', () => {
    const m = createReverseLanguageMap({ de: 'German', en: 'English' });
    assert.deepEqual(m, { German: 'de', English: 'en' });
  });

  it('handles empty or undefined map', () => {
    assert.deepEqual(createReverseLanguageMap({}), {});
    // @ts-expect-error runtime undefined accepted
    assert.deepEqual(createReverseLanguageMap(), {});
  });

  it('generates default language map with known language codes', () => {
    const map = generateDefaultLanguageMap(['en', 'de', 'fr']);
    assert.deepEqual(map, {
      en: 'English',
      de: 'German',
      fr: 'French',
    });
  });

  it('generates default language map with unknown language codes (capitalizes)', () => {
    const map = generateDefaultLanguageMap(['xx', 'yy']);
    assert.deepEqual(map, {
      xx: 'Xx',
      yy: 'Yy',
    });
  });

  it('generates default language map with mixed known and unknown codes', () => {
    const map = generateDefaultLanguageMap(['en', 'unknown']);
    assert.equal(map.en, 'English');
    assert.equal(map.unknown, 'Unknown');
  });

  it('handles empty language codes array', () => {
    const map = generateDefaultLanguageMap([]);
    assert.deepEqual(map, {});
  });

  it('handles undefined language codes', () => {
    const map = generateDefaultLanguageMap(null);
    assert.deepEqual(map, {});
  });

  it('generates default language map mapping kk to Kurdish (Kurmanji)', () => {
    const map = generateDefaultLanguageMap(['kk']);
    assert.equal(map.kk, 'Kurdish (Kurmanji)');
  });

  it('generates default language map mapping ks to Kurdish (Sorani)', () => {
    const map = generateDefaultLanguageMap(['ks']);
    assert.equal(map.ks, 'Kurdish (Sorani)');
  });
});
