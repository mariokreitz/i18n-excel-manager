import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLanguageChoices } from '../src/cli/init.js';

describe('init language choices fallback', () => {
  it('uses configured languages when provided', () => {
    const cfg = { languages: { en: 'English', fr: 'French' } };
    const { choices } = buildLanguageChoices(cfg);
    const names = choices.map((c) => c.value).toSorted();
    assert.deepEqual(names, ['en', 'fr']);
  });

  it('falls back to en,de when config.languages is empty', () => {
    const { choices } = buildLanguageChoices({ languages: {} });
    const values = choices.map((c) => c.value).toSorted();
    assert.deepEqual(values, ['de', 'en']);
  });

  it('falls back to en,de when config is undefined', () => {
    const { choices } = buildLanguageChoices();
    const values = choices.map((c) => c.value).toSorted();
    assert.deepEqual(values, ['de', 'en']);
  });
});
