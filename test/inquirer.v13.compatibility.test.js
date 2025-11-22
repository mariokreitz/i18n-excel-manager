import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import inquirer from 'inquirer';

describe('Inquirer v13 Compatibility Tests', () => {
  it('should have inquirer loaded', () => {
    assert.ok(inquirer, 'inquirer should be loaded');
    assert.ok(inquirer.prompt, 'inquirer.prompt should exist');
  });

  it('should expose expected prompt types in v13', () => {
    const promptModule = inquirer.createPromptModule();
    assert.ok(promptModule.prompts, 'prompts should be available');

    const expectedPrompts = [
      'input',
      'select',
      'number',
      'confirm',
      'rawlist',
      'expand',
      'checkbox',
      'password',
      'editor',
      'search',
    ];

    for (const promptType of expectedPrompts) {
      assert.ok(
        promptModule.prompts[promptType],
        `Prompt type '${promptType}' should exist in v13`,
      );
    }
  });

  it('should NOT have legacy list prompt type in v13', () => {
    const promptModule = inquirer.createPromptModule();
    assert.equal(
      promptModule.prompts.list,
      undefined,
      'Legacy list prompt type should not exist in v13',
    );
  });

  it('should have select prompt type as replacement for list', () => {
    const promptModule = inquirer.createPromptModule();
    assert.ok(
      promptModule.prompts.select,
      'select prompt type should exist as replacement for list',
    );
    assert.equal(
      typeof promptModule.prompts.select,
      'function',
      'select should be a function',
    );
  });

  it('should validate main menu prompt configuration', () => {
    const mainMenuPrompt = {
      type: 'select',
      name: 'action',
      message: 'Choose an action:',
      choices: [
        { name: 'Convert i18n files to Excel', value: 'toExcel' },
        { name: 'Convert Excel to i18n files', value: 'toJson' },
        { name: 'Initialize i18n files', value: 'init' },
        { name: 'Exit', value: 'exit' },
      ],
    };

    const promptModule = inquirer.createPromptModule();
    assert.ok(
      promptModule.prompts[mainMenuPrompt.type],
      `Prompt type ${mainMenuPrompt.type} should exist`,
    );
    assert.equal(mainMenuPrompt.type, 'select');
    assert.ok(Array.isArray(mainMenuPrompt.choices));
    assert.equal(mainMenuPrompt.choices.length, 4);
  });

  it('should validate checkbox prompt configuration', () => {
    const checkboxPrompt = {
      type: 'checkbox',
      name: 'langs',
      message: 'Select languages to initialize:',
      choices: [
        { name: 'en – English', value: 'en', checked: true },
        { name: 'de – German', value: 'de', checked: true },
      ],
      validate: (arr) =>
        arr.length > 0 ? true : 'Select at least one language',
    };

    const promptModule = inquirer.createPromptModule();
    assert.ok(
      promptModule.prompts[checkboxPrompt.type],
      'checkbox prompt type should exist',
    );
    assert.equal(checkboxPrompt.type, 'checkbox');
    assert.equal(typeof checkboxPrompt.validate, 'function');
    assert.equal(checkboxPrompt.validate([]), 'Select at least one language');
    assert.equal(checkboxPrompt.validate(['en']), true);
  });

  it('should validate confirm prompt configuration', () => {
    const confirmPrompt = {
      type: 'confirm',
      name: 'doInit',
      message: 'Initialize i18n directory now?',
      default: true,
    };

    const promptModule = inquirer.createPromptModule();
    assert.ok(
      promptModule.prompts[confirmPrompt.type],
      'confirm prompt type should exist',
    );
    assert.equal(confirmPrompt.type, 'confirm');
    assert.equal(typeof confirmPrompt.default, 'boolean');
  });

  it('should validate input prompt configuration', () => {
    const inputPrompt = {
      type: 'input',
      name: 'sourcePath',
      message: 'Path to i18n files:',
      default: './public/assets/i18n',
    };

    const promptModule = inquirer.createPromptModule();
    assert.ok(
      promptModule.prompts[inputPrompt.type],
      'input prompt type should exist',
    );
    assert.equal(inputPrompt.type, 'input');
    assert.ok(inputPrompt.message);
  });
});
