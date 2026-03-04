# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-03-04

### Fixed

- **Critical: Config values ignored for analyze/translate**: `dispatchCommand` now passes `mergedOptions` (with
  config.json values resolved) to `runAnalyze` and `runTranslate` instead of raw CLI options.
- **Critical: Recursive call-stack overflow**: Replaced recursive `showMainMenu` / `askForAnotherAction` pattern with an
  iterative `while` loop. The interactive menu can now run indefinitely without stack growth.
- **Languages no longer required in config.json**: The `languages` field in the Joi config schema is now optional,
  defaulting to `{}`. Users can bootstrap a project with only `defaults`.
- **Broken Angular directive regex patterns**: Fixed `[translate]` and `*translate` regex patterns that had an extra
  literal quote preventing matches. Added bare-key variants (`[translate]="KEY"`, `*translate="KEY"`).
- **Silent discard of unreadable files**: `extractKeysFromCodebase` now logs a `console.warn` for each file that fails
  to read, instead of silently skipping it.
- **Language mapping mismatch**: `kk` now maps to `'Kurdish (Kurmanji)'` and `ks` to `'Kurdish (Sorani)'` in the default
  language map.
- **Dead extract branch**: Removed unreachable `options.extract` code path from `dispatchCommand`.

### Added

- **`--json-report` flag**: `analyze --json-report` outputs the analysis report as parseable JSON to stdout.
- **`--fail-on-missing` / `--fail-on-unused` flags**: CI gate flags that make `analyze` exit with code 1 when issues are
  detected.
- **`--template` flag for init**: `init --template <file>` uses a custom JSON file as the starter translation skeleton
  instead of built-in samples.
- **`--format sarif` output**: `analyze --format sarif` produces a SARIF 2.1.0 report compatible with GitHub Code
  Scanning.
- **`--watch` mode for analyze**: `analyze --watch` re-runs analysis on file changes using chokidar.
- **`--provider` flag for custom TranslationProvider**: `analyze --provider ./my-provider.js` loads a custom translation
  provider module.
- **`--all-sheets` flag**: `excel-to-i18n --all-sheets` processes all worksheets in a workbook, merging translations.
- **Incremental cached analysis**: Analysis results are cached in `.i18n-cache.json` keyed by content hash. Use
  `--no-cache` to disable.
- **`ora` progress spinners**: Long-running operations (conversion, translation) now show progress spinners in TTY
  environments.
- **Conventional Commits tooling**: Added `commitlint`, `release-it`, and commit-msg hook for enforced commit
  conventions.
- **Backup before in-place Excel write**: `translateApp` now creates a `.bak.xlsx` backup before overwriting the
  workbook.

### Changed

- **Expanded starter translations**: `buildStarterContentFor` now covers 15 languages with a language-tagged generic
  fallback (e.g. `[xx] My App`) instead of silently returning English.
- **Extracted `entryHelpers.js`**: `tryLoadLocalConfig` and `isExecutedDirectly` are now in a testable
  `src/cli/entryHelpers.js` module.
- **Stability shim docs**: `params.js` and `options.js` now have JSDoc comments explaining their role as public-API
  stability shims.
- **Interactive error handling docs**: Added inline documentation explaining the intentional difference between
  interactive and CLI error handling.

## [2.2.1] - 2026-02-02

### Fixed

- **Analyze Codebase default path**: Fixed incorrect default path in interactive mode for "Analyze Codebase" command.
  - The input prompt now correctly asks for the i18n JSON directory path instead of source code folder.
  - Default path changed from `./src` to `public/assets/i18n` (matching Angular v17+/ngx-translate v17+ conventions).
  - Code pattern default updated to `src/**/*.{ts,js,html}` to properly scope to Angular source directory.

### Changed

- **Updated Gemini models**: Refreshed available AI models to include latest Gemini offerings.
  - Added `gemini-2.5-flash-lite` (ultra fast, cost-efficient).
  - Added `gemini-2.5-pro` (advanced thinking model).
  - Added `gemini-3-flash-preview` (next-gen balanced model).
  - Added `gemini-3-pro-preview` (most intelligent multimodal model).
  - Removed deprecated `gemini-1.5-flash` and `gemini-1.5-pro` models.
- **Improved npm discoverability**: Enhanced package.json with better description and expanded keywords.
- **README improvements**: Updated Quick Start to emphasize interactive CLI mode for easier onboarding.

## [2.2.0] - 2026-01-20

### Added

- **Analyze command**: Scan codebase for missing or unused translation keys in i18n JSON files.
  - Compares translation keys defined in JSON files against keys actually used in the codebase.
  - Supports custom glob patterns for source code file scanning (default: `**/*.{html,ts,js}`).
  - Generates detailed reports of missing and unused translation keys per language file.
- **AI-powered auto-translation**: Integrated Gemini API for automatic translation of missing values in Excel files.
  - Automatically detects missing translations and generates translations using Gemini AI.
  - Supports configurable source language and language mapping.
  - Includes `--translate` flag for analyze command to enable auto-translation.
  - Accepts Gemini API key via `--api-key` flag or `GEMINI_API_KEY`/`I18N_MANAGER_API_KEY` environment variables.
  - Configurable Gemini model selection (default: `gemini-2.5-flash`).
- **Comprehensive README overhaul**:
  - Updated Angular integration examples to Angular 20+ with ngx-translate v17+.
  - Uses modern standalone components and `inject()` function pattern.
  - Integrated signals for reactive state management.
  - Added detailed documentation for new analyze and AI translation features.
  - Reorganized structure for better feature discoverability.
  - Added "Known Issues" section documenting language mapping workaround.
  - Improved CLI options reference and API documentation.

## [2.1.2] - 2025-11-22

### Chore

- Updated Inquirer to `13.0.1` with new API which will be later migrated to their newer package `@inquirer/core` in a
  future release.
- Upgrade dev dependency `eslint-plugin-sonarjs` to `3.0.5` to support ESLint 9 peer range and resolve `npm ci` peer
  dependency conflict (previous `^0.25.x` only supported ESLint <=8). No rule renames; existing configuration remains
  valid.
- Migrate from legacy `.eslintrc.json` to flat config `eslint.config.js` required by ESLint v9; rule set preserved with
  prior overrides.
- Comprehensive JSDoc improvements across all modules for better code documentation and maintainability.
- Code refactoring and cleanup to improve code quality and consistency.

## [2.1.1] - 2025-11-03

### Fixed

- CLI config fallback now robust when installed as a dependency or run via npx/global: if no `config.json` exists in the
  user's CWD, the packaged `config.json` is used automatically. Prevents interactive init error "[checkbox prompt] No
  selectable choices" when no local config is present.
- Interactive init now has a safe fallback language choice list (`en`, `de`) when `config.languages` is missing or
  empty, ensuring a non-empty choices array.

## [2.1.0] - 2025-10-28

### Added

- Config autoload: the CLI now automatically loads `./config.json` from the current working directory (CWD) when
  present.
- Tests: coverage for config autoload, explicit `--config` path, CLI flag precedence over config defaults, and CLI
  params branches.
- Init command features:
  - Initialize an i18n directory with starter JSON files based on configured languages.
  - Dry-run support to preview planned creations without writing files.
  - Never overwrites existing files; reports them as "Skipped".
  - Interactive mode offers initialization when no i18n files are detected at the configured source path.

### Changed

- Precedence clarified and enforced: CLI flags > `config.defaults` > built-in defaults; languageMap precedence: CLI >
  `config.languages` > runtime config.
- README: minimal update to the Configuration section to document the above behaviors.
- Init respects config defaults (via autoload) for output path and uses configured languages when `--languages` is
  omitted.

### Fixed

- Bug where config felt required but was ignored unless passing flags; now optional and correctly applied when present.
