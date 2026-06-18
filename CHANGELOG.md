# Changelog

All notable changes to this project will be documented in this file.

## [2.5.2] - 2026-06-18

### Security

- **Resolved all `npm audit` findings (2 → 0)**: Eliminated 2 moderate-severity advisories — `protobufjs` schema property-shadowing (`GHSA-f38q-mgvj-vph7`, fixed via `7.6.4`, pulled in transitively through `@google/genai`) and the `js-yaml` quadratic-complexity merge-key DoS (`GHSA-h67p-54hq-rp68`, fixed via `4.2.0`).

### Changed

- **Dependency updates** (functionality preserved, full test suite green): `@google/genai` 2.6.0 → 2.8.0, `commander` 14 → 15, `inquirer` 13 → 14, `eslint-plugin-n` 18.0.1 → 18.1.0, `release-it` 20.0.1 → 20.2.0.
- **Final maintenance release**: this is the last planned patch for `i18n-excel-manager`. The package remains deprecated — please migrate to [`@verbatra/cli`](https://github.com/mariokreitz/verbatra).

### Deferred

- **`eslint` 10 and `eslint-plugin-unicorn` 67** were intentionally skipped: they are incompatible with the current ESLint plugin set (`eslint-plugin-eslint-comments`, `eslint-plugin-import`) and break the lint toolchain. They are dev-only and carry no security impact.

## [2.5.1] - 2026-05-29

### Deprecated

- **Project sunset**: `i18n-excel-manager` is deprecated and no longer maintained.
- **Replacement project**: Development continues in `@verbatra/cli` (https://github.com/mariokreitz/verbatra).
- **Runtime migration notice**: CLI commands now print a deprecation warning that points to `verbatra`.
- **Repository transition policy**: this repository remains read-only for a 2-4 week migration window, then will be archived.
- **npm policy**: package name `i18n-excel-manager` is intended to remain permanently deprecated.

## [2.5.0] - 2026-05-28

### Security

- **Resolved all `npm audit` findings (10 → 0)**: Eliminated 1 critical, 3 high, and 6 moderate vulnerabilities by upgrading transitive dependencies (`basic-ftp`, `fast-uri`, `ws`, `tmp`, `brace-expansion`, `@protobufjs/utf8`, `agent-base`) brought in primarily through `@google/genai`.
- **`uuid` override**: Added `uuid: ^11.1.1` to `overrides` in `package.json` to remediate `GHSA-w5hq-g745-h8pq` (missing buffer bounds check in `uuid` <= 10) used transitively by `exceljs`.

### Changed

- **Runtime dependency upgrades**:
  - `@google/genai` `^1.45.0` → `^2.6.0` (major). The v2 breaking changes are scoped to the Interactions API only; `generateContent` (used by `src/providers/gemini.provider.js`) is unaffected.
  - `inquirer` `^13.0.1` → `^13.4.3`.
  - `joi` `^18.0.1` → `^18.2.1` (adds link recursion / max call stack protections).
  - `ora` `^9.3.0` → `^9.4.0`.
- **Dev tooling upgrades**:
  - `@commitlint/cli` and `@commitlint/config-conventional` `^20.5.0` → `^21.0.1` (now require Node >=22 for the dev environment; the published package still supports Node >=20.19.0 for consumers).
  - `@release-it/conventional-changelog` `^10.0.5` → `^11.0.0`.
  - `release-it` `^19.2.4` → `^20.0.1` (migrates to `@inquirer/prompts`, upgrades `undici` to v7).
  - `eslint-plugin-n` `^17.23.1` → `^18.0.1`.
  - `eslint-plugin-promise` `^7.2.1` → `^7.3.0` (adds ESLint v10 support).
  - `eslint-plugin-unicorn` `^63.0.0` → `^64.0.0`.
  - `eslint-import-resolver-node` `^0.3.9` → `^0.4.0`.
  - `lint-staged` `^16.4.0` → `^17.0.5`.
  - `prettier` `^3.3.3` → `^3.8.3`.
- **`.prettierignore` hardening**: Added all `test/tmp-*` directories so transient test artifacts no longer break `format:check`.

### Deferred (tracked as follow-ups)

- **ESLint v10**: Held at `^9.39.4` because `eslint-plugin-import@2.32.0` still pins `eslint <= ^9`. Migrate to `eslint-plugin-import-x` to unlock ESLint v10.
- **`inquirer` v14**: Held at `^13.4.3` until the v13 → v14 prompt API changes are reviewed against `src/cli/interactive.js` and `src/cli/init.js`.

## [2.4.1] - 2026-03-20

### Fixed

- **False-positive `unused` keys in monorepos / Nx workspaces**: `analyze` can now scan multiple source roots in one run, which fixes reports that previously missed usages in shared packages or libraries.
- **Metadata-based translation key extraction**: The analyzer now detects keys stored in metadata fields such as `titleKey` and `descriptionKey`, reducing false-positive `unused` findings for route/config-driven apps.
- **Array-driven translate usage detection**: Literal key arrays consumed by `translate.get(...)`, `translate.instant(...)`, or `translate.stream(...)` are now detected so dynamic-but-static translation sets are analyzed correctly.
- **CI audit failure on release pipeline**: Updated the `flatted` override to a non-vulnerable version so `npm audit --audit-level moderate` passes in CI and release workflows.

### Added

- **`--patterns <list>` for monorepo-friendly analyze runs**: Added a dedicated CLI option for comma-separated glob patterns, making multi-root scans easier and less shell-dependent.
- **Configurable `--metadata-keys <list>` support**: Teams can now extend or customize which metadata property names should be treated as translation keys.
- **Additional regression coverage for analyzer and CLI option parsing**: Added tests for multi-pattern scanning, metadata key configuration, explicit metadata disablement, and analyze command fallback behavior.

### Changed

- **README monorepo guidance**: Documented Nx/monorepo analyze usage, new analyzer options, and removed the outdated Known Issues section now that the issue is resolved.
- **Analyzer cache compatibility**: Cache entries now track extractor signatures in addition to version/hash so changing analyze extraction options invalidates stale cached results safely.

## [2.4.0] - 2026-03-17

### Fixed

- **TypeScript key extraction false negatives in analyze flow**: The analyzer now correctly detects ngx-translate keys in modern Angular TypeScript usage, including generic calls like `translate.get<string>(...)` and nested generic signatures.
- **Missed service-call variants**: Extraction now covers `translate` and `translateService` call forms, optional chaining (`?.`), and backtick string literals used in translation calls.
- **Stale extraction cache after pattern updates**: Added extractor cache versioning so older `.i18n-cache.json` entries are automatically invalidated when extraction logic changes.

### Added

- **`marker(...)` helper extraction**: Analyze now detects keys declared through marker-based workflows (e.g. table-driven/dynamic UI key registration).
- **Comprehensive analyzer regression tests**: Added integration fixtures and branch-focused coverage tests for command/watch/output/provider/contract/runtime/validation code paths to prevent recurrence of patch coverage gaps.

### Changed

- **Architecture hardening cleanup**:
  - Removed legacy CLI re-export shims and transitional modules.
  - Updated command and contract imports to canonical module paths.
  - Removed legacy conversion invocation adapters in command handlers.
  - Enforced direct layer boundaries (e.g. validation imported from core directly where appropriate).
- **Angular fixture modernization in tests**: Updated analyze integration fixtures to modern Angular 20+ / ngx-translate v17+ patterns, including `app.config.ts`, `provideTranslateService(...)`, and standalone component usage.

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
