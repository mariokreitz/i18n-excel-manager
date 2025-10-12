import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadValidatedConfig, validateConfigObject } from '../src/io/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmpDir = path.join(__dirname, 'tmp-config');

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
}

describe('io/config', () => {
  it('validateConfigObject: accepts valid config and rejects unknowns', () => {
    const valid = {
      languages: { de: 'German' },
      defaults: {
        sourcePath: 'in',
        targetFile: 'out.xlsx',
        targetPath: 'out',
        sheetName: 'Translations',
      },
    };
    const result = validateConfigObject(valid);
    assert.equal(result.defaults.sheetName, 'Translations');

    const invalid = { ...valid, extra: true };
    assert.throws(() => validateConfigObject(invalid), /Invalid configuration/);
  });

  it('loadValidatedConfig: parses and validates JSON', async () => {
    const cfgPath = path.join(tmpDir, 'cfg.json');
    await write(
      cfgPath,
      JSON.stringify({
        languages: { en: 'English' },
        defaults: {
          sourcePath: 'a',
          targetFile: 'b.xlsx',
          targetPath: 'c',
          sheetName: 'S',
        },
      }),
    );
    const cfg = await loadValidatedConfig(cfgPath);
    assert.equal(cfg.languages.en, 'English');
  });

  it('loadValidatedConfig: throws on malformed JSON', async () => {
    const cfgPath = path.join(tmpDir, 'bad.json');
    await write(cfgPath, '{ bad json');
    await assert.rejects(() => loadValidatedConfig(cfgPath), /Invalid JSON/);
  });
});
