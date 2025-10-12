import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { consoleReporter } from '../src/reporters/console.js';

let origLog;
let origWarn;
let logs;
let warns;

describe('reporters/console', () => {
  beforeEach(() => {
    origLog = console.log;
    origWarn = console.warn;
    logs = [];
    warns = [];
    // ...existing code...
    console.log = (...args) => logs.push(args.join(' '));
    console.warn = (...args) => warns.push(args.join(' '));
  });

  afterEach(() => {
    // ...existing code...
    console.log = origLog;
    console.warn = origWarn;
  });

  it('prints missing translations section', () => {
    const report = {
      missing: [{ key: 'a.b', lang: 'en' }],
      duplicates: [],
      placeholderInconsistencies: [],
    };
    consoleReporter.print(report);
    const out = logs.join('\n');
    assert.match(out, /Missing translations/);
    assert.match(out, /a\.b \(en\)/);
  });

  it('prints duplicates section', () => {
    const report = {
      missing: [],
      duplicates: ['x.y', 'x.z'],
      placeholderInconsistencies: [],
    };
    consoleReporter.print(report);
    const out = logs.join('\n');
    assert.match(out, /Duplicate keys/);
    assert.match(out, /x\.y/);
    assert.match(out, /x\.z/);
  });

  it('prints placeholder inconsistencies section with placeholders per lang', () => {
    const report = {
      missing: [],
      duplicates: [],
      placeholderInconsistencies: [
        {
          key: 'greet',
          placeholders: {
            de: new Set(['name', 'count']),
            en: new Set(['name']),
          },
        },
      ],
    };
    consoleReporter.print(report);
    const out = logs.join('\n');
    assert.match(out, /Inconsistent placeholders/);
    assert.match(out, /greet/);
    assert.match(out, /\[de]/);
    assert.match(out, /\[en]/);
    assert.match(out, /name/);
  });

  it('warn delegates to console.warn', () => {
    consoleReporter.warn('hello');
    assert.equal(warns.includes('hello'), true);
  });
});
