import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Interactive.js Inquirer v13 Compatibility', () => {
  it('should detect usage of deprecated list prompt type', () => {
    const interactivePath = join(
      __dirname,
      '..',
      'src',
      'cli',
      'interactive.js',
    );
    const content = readFileSync(interactivePath, 'utf8');

    const hasListType = content.includes("type: 'list'");

    if (hasListType) {
      console.log(
        '❌ BREAKING CHANGE DETECTED: src/cli/interactive.js uses deprecated "list" prompt type',
      );
      console.log(
        '   This is not compatible with inquirer v13.x which replaced "list" with "select"',
      );
    }

    assert.ok(
      !hasListType,
      'interactive.js should not use deprecated "list" prompt type. Use "select" instead for inquirer v13+',
    );
  });

  it('should verify select prompt type is used instead of list', () => {
    const interactivePath = join(
      __dirname,
      '..',
      'src',
      'cli',
      'interactive.js',
    );
    const content = readFileSync(interactivePath, 'utf8');

    const hasSelectType = content.includes("type: 'select'");

    assert.ok(
      hasSelectType,
      'interactive.js should use "select" prompt type for inquirer v13+',
    );
  });

  it('should verify all prompt types used in interactive.js are v13 compatible', () => {
    const interactivePath = join(
      __dirname,
      '..',
      'src',
      'cli',
      'interactive.js',
    );
    const content = readFileSync(interactivePath, 'utf8');

    const promptModule = inquirer.createPromptModule();
    const availableTypes = Object.keys(promptModule.prompts);

    const typeRegex = /type:\s*["'](\w+)["']/g;
    let match;
    const usedTypes = new Set();

    while ((match = typeRegex.exec(content)) !== null) {
      usedTypes.add(match[1]);
    }

    for (const type of usedTypes) {
      assert.ok(
        availableTypes.includes(type),
        `Prompt type "${type}" should be available in inquirer v13. Available types: ${availableTypes.join(', ')}`,
      );
    }
  });

  it('should verify init.js uses compatible prompt types', () => {
    const initPath = join(__dirname, '..', 'src', 'cli', 'init.js');
    const content = readFileSync(initPath, 'utf8');

    const promptModule = inquirer.createPromptModule();
    const availableTypes = Object.keys(promptModule.prompts);

    const typeRegex = /type:\s*["'](\w+)["']/g;
    let match;
    const usedTypes = new Set();

    while ((match = typeRegex.exec(content)) !== null) {
      usedTypes.add(match[1]);
    }

    for (const type of usedTypes) {
      assert.ok(
        availableTypes.includes(type),
        `Prompt type "${type}" in init.js should be available in inquirer v13`,
      );
    }
  });

  it('should list all files using inquirer prompts', () => {
    const filesWithPrompts = ['src/cli/interactive.js', 'src/cli/init.js'];

    const results = [];

    for (const file of filesWithPrompts) {
      const filePath = join(__dirname, '..', file);
      const content = readFileSync(filePath, 'utf8');

      const typeRegex = /type:\s*["'](\w+)["']/g;
      let match;
      const types = [];

      while ((match = typeRegex.exec(content)) !== null) {
        types.push(match[1]);
      }

      results.push({ file, types });
    }

    console.log('\nFiles using inquirer prompts:');
    for (const { file, types } of results) {
      console.log(`  ${file}:`);
      for (const type of types) {
        console.log(`    - ${type}`);
      }
    }

    assert.ok(results.length > 0, 'Should find files using inquirer');
  });
});
