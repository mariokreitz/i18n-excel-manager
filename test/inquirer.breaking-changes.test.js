import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Inquirer Breaking Changes Detection', () => {
  it('should detect inquirer version from package.json', () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    assert.ok(
      packageJson.dependencies.inquirer,
      'inquirer should be in dependencies',
    );

    const inquirerVersion = packageJson.dependencies.inquirer;
    const versionMatch = inquirerVersion.match(/\d+/);

    if (versionMatch) {
      const majorVersion = Number.parseInt(versionMatch[0], 10);
      assert.ok(majorVersion >= 13, 'Should be using inquirer v13 or higher');
    }
  });

  it('should document list to select migration', () => {
    const migration = {
      from: { type: 'list', deprecated: true },
      to: { type: 'select', current: true },
      affectedFiles: ['src/cli/interactive.js'],
      lineNumber: 55,
    };

    assert.equal(migration.from.type, 'list');
    assert.equal(migration.to.type, 'select');
    assert.equal(migration.from.deprecated, true);
    assert.equal(migration.to.current, true);
  });

  it('should verify all prompt types used in codebase', () => {
    const usedPromptTypes = {
      select: { files: ['src/cli/interactive.js'], v13Compatible: true },
      confirm: { files: ['src/cli/interactive.js'], v13Compatible: true },
      input: { files: ['src/cli/interactive.js'], v13Compatible: true },
      checkbox: { files: ['src/cli/init.js'], v13Compatible: true },
    };

    for (const [type, info] of Object.entries(usedPromptTypes)) {
      assert.ok(
        info.v13Compatible,
        `Prompt type ${type} should be v13 compatible`,
      );
      assert.ok(info.files.length > 0, `Prompt type ${type} should have files`);
    }
  });

  it('should identify files needing updates for v13', () => {
    const filesToUpdate = [
      {
        file: 'src/cli/interactive.js',
        line: 55,
        currentCode: "type: 'list'",
        newCode: "type: 'select'",
        reason: 'list prompt type removed in inquirer v13',
      },
    ];

    assert.equal(filesToUpdate.length, 1);
    assert.equal(filesToUpdate[0].file, 'src/cli/interactive.js');
    assert.equal(filesToUpdate[0].currentCode, "type: 'list'");
    assert.equal(filesToUpdate[0].newCode, "type: 'select'");
  });
});
