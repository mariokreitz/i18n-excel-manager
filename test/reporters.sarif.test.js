import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildSarifReport } from '../src/reporters/sarif.js';

describe('reporters/sarif', () => {
  it('builds valid SARIF envelope with expected rules', () => {
    const report = {
      totalCodeKeys: 3,
      fileReports: {
        'en.json': {
          missing: ['app.title'],
          unused: ['legacy.old'],
        },
      },
    };

    const sarif = buildSarifReport(report, '/workspace/i18n');
    assert.equal(sarif.version, '2.1.0');
    assert.equal(Array.isArray(sarif.runs), true);
    assert.equal(sarif.runs.length, 1);

    const run = sarif.runs[0];
    const ruleIds = run.tool.driver.rules.map((rule) => rule.id);
    assert.deepEqual(ruleIds, ['i18n/missing-key', 'i18n/unused-key']);
    assert.equal(run.results.length, 2);
  });

  it('emits expected result payload for missing and unused keys', () => {
    const report = {
      totalCodeKeys: 2,
      fileReports: {
        'de.json': {
          missing: ['screen.login.title'],
          unused: ['screen.old.button'],
        },
      },
    };

    const sarif = buildSarifReport(report, '/repo/public/assets/i18n');
    const [missing, unused] = sarif.runs[0].results;

    assert.equal(missing.ruleId, 'i18n/missing-key');
    assert.equal(missing.level, 'warning');
    assert.match(missing.message.text, /screen.login.title/);
    assert.equal(
      missing.locations[0].physicalLocation.artifactLocation.uri,
      'de.json',
    );

    assert.equal(unused.ruleId, 'i18n/unused-key');
    assert.equal(unused.level, 'note');
    assert.match(unused.message.text, /screen.old.button/);
    assert.equal(
      unused.locations[0].physicalLocation.artifactLocation.uri,
      'de.json',
    );
  });

  it('normalizes Windows path separators in originalUriBaseIds', () => {
    const report = {
      totalCodeKeys: 0,
      fileReports: {},
    };

    const winPath = String.raw`C:\repo\public\assets\i18n`;
    const sarif = buildSarifReport(report, winPath);
    const uri = sarif.runs[0].originalUriBaseIds['%SRCROOT%'].uri;

    assert.equal(uri, 'file:///C:/repo/public/assets/i18n/');
  });

  it('returns empty results list when no missing or unused findings exist', () => {
    const report = {
      totalCodeKeys: 0,
      fileReports: {
        'en.json': { missing: [], unused: [] },
      },
    };

    const sarif = buildSarifReport(report, path.resolve('public/assets/i18n'));
    assert.deepEqual(sarif.runs[0].results, []);
  });
});
