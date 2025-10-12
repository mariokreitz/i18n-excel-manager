import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createReverseLanguageMap } from '../src/core/languages/mapping.js';

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
});
