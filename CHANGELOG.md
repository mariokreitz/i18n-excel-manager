# Changelog

All notable changes to this project will be documented in this file.

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
