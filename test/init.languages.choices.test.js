import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStarterContentFor } from '../src/cli/helpers.js';
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

describe('buildStarterContentFor', () => {
  it('returns correct German content', () => {
    const result = buildStarterContentFor('de');
    assert.equal(result.app.title, 'Meine App');
    assert.equal(result.app.welcome, 'Willkommen in Ihrer lokalisierten App');
  });

  it('returns language-tagged placeholder for unknown codes', () => {
    const result = buildStarterContentFor('xx');
    assert.match(result.app.title, /\[xx\]/);
    assert.match(result.app.welcome, /\[xx\]/);
  });

  it('does NOT return English content for unknown language codes', () => {
    const result = buildStarterContentFor('xx');
    assert.notEqual(result.app.title, 'My App');
  });

  it('returns known content for Spanish', () => {
    const result = buildStarterContentFor('es');
    assert.equal(result.app.title, 'Mi aplicación');
  });
});
