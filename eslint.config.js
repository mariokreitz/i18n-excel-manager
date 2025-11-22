import js from '@eslint/js';
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import importPlugin from 'eslint-plugin-import';
import nPlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';

function pluginRules(plugin, path) {
  const cfg =
    path?.split('.').reduce((acc, key) => acc && acc[key], plugin) || {};
  return cfg.rules || {};
}

export default [
  { ignores: ['coverage/**', 'coverage/**/*'] },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '**/coverage/**',
      'assets/',
      'locales/',
      'src/main.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.mjs', '.cjs'],
          moduleDirectory: ['node_modules'],
          paths: ['.'],
        },
      },
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      security: securityPlugin,
      sonarjs: sonarjsPlugin,
      n: nPlugin,
      unicorn: unicornPlugin,
      'eslint-comments': eslintCommentsPlugin,
    },
    rules: {
      // Base recommended from @eslint/js
      ...js.configs.recommended.rules,
      // Merge plugin recommended rule sets (silently skip if missing)
      ...pluginRules(importPlugin, 'configs.recommended'),
      ...pluginRules(promisePlugin, 'configs.recommended'),
      ...pluginRules(securityPlugin, 'configs.recommended'),
      ...pluginRules(sonarjsPlugin, 'configs.recommended'),
      ...pluginRules(nPlugin, 'configs.recommended'),
      ...pluginRules(unicornPlugin, 'configs.recommended'),
      ...pluginRules(eslintCommentsPlugin, 'configs.recommended'),
      // Original customizations
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      'no-shadow': 'error',
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['obj', 'column'] },
      ],
      curly: ['error', 'multi-line'],
      'object-shorthand': ['error', 'always'],
      'no-console': 'off',
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'test/**',
            '**/*.test.js',
            '**/*.config.js',
            '**/cli.js',
          ],
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      'import/no-cycle': ['warn', { maxDepth: 1 }],
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'promise/always-return': 'warn',
      'promise/no-nesting': 'warn',
      'promise/no-multiple-resolved': 'error',
      'n/no-deprecated-api': 'error',
      'n/no-unsupported-features/es-syntax': 'off',
      'security/detect-child-process': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'off',
      'sonarjs/cognitive-complexity': ['warn', 15],
      'unicorn/prefer-module': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/prefer-array-index-of': 'off',
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 120],
      'max-params': ['warn', 5],
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/expiring-todo-comments': 'off',
      'sonarjs/slow-regex': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      'no-console': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'unicorn/no-null': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'object-shorthand': 'off',
      'unicorn/prefer-array-index-of': 'off',
      'unicorn/prefer-spread': 'off',
      'no-shadow': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-optional-catch-binding': 'off',
      'max-lines-per-function': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'unicorn/no-empty-file': 'off',
      'import/no-unresolved': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/publicly-writable-directories': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/cli/**/*.js', 'src/cli/*.js'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['cli.js'],
    rules: {
      'n/no-process-exit': 'off',
      'n/no-sync': 'off',
      'no-console': 'off',
      'no-param-reassign': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      'n/no-unpublished-import': 'off',
      'unicorn/no-array-reduce': 'off',
    },
  },
];
