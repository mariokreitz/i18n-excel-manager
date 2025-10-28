# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2025-10-28
### Added
- Config autoload: the CLI now automatically loads `./config.json` from the current working directory (CWD) when present.
- Tests: coverage for config autoload, explicit `--config` path, CLI flag precedence over config defaults, and CLI params branches.

### Changed
- Precedence clarified and enforced: CLI flags > `config.defaults` > built-in defaults; languageMap precedence: CLI > `config.languages` > runtime config.
- README: minimal update to the Configuration section to document the above behaviors.

### Fixed
- Bug where config felt required but was ignored unless passing flags; now optional and correctly applied when present.

