import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { convertToExcel, convertToJson } from '../src/index.js';

const tempDirs = [];

async function makeRoundtripFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'iem-roundtrip-'));
  tempDirs.push(root);

  const srcDir = path.join(root, 'i18n');
  const outDir = path.join(root, 'out');
  const excelFile = path.join(root, 'translations.xlsx');

  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  await fs.writeFile(
    path.join(srcDir, 'en.json'),
    JSON.stringify(
      {
        app: {
          title: 'Dashboard',
          subtitle: 'Welcome {{name}}',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  await fs.writeFile(
    path.join(srcDir, 'de.json'),
    JSON.stringify(
      {
        app: {
          title: 'Instrumententafel',
          subtitle: 'Willkommen {{name}}',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return { excelFile, outDir, srcDir };
}

describe('integration roundtrip', () => {
  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('converts JSON -> Excel -> JSON with key/value parity', async () => {
    const { srcDir, excelFile, outDir } = await makeRoundtripFixture();

    await convertToExcel(srcDir, excelFile, {
      languageMap: { en: 'English', de: 'German' },
    });
    await convertToJson(excelFile, outDir, {
      languageMap: { en: 'English', de: 'German' },
    });

    const enRoundTrip = JSON.parse(
      await fs.readFile(path.join(outDir, 'en.json'), 'utf8'),
    );
    const deRoundTrip = JSON.parse(
      await fs.readFile(path.join(outDir, 'de.json'), 'utf8'),
    );

    assert.equal(enRoundTrip.app.title, 'Dashboard');
    assert.equal(enRoundTrip.app.subtitle, 'Welcome {{name}}');
    assert.equal(deRoundTrip.app.title, 'Instrumententafel');
    assert.equal(deRoundTrip.app.subtitle, 'Willkommen {{name}}');
  });
});
