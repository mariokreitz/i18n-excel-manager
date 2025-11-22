# Changelog

All notable changes to this project will be documented in this file.

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
