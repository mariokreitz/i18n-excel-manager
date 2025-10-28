# v2.1.0 (2025-10-28)

Highlights

- Config autoload from CWD (config optional, respected by default)
- Precedence clarified: CLI > config.defaults > built-ins; languageMap: CLI > config.languages > runtime
- Additional tests and minimal README update

Upgrade Notes

- No breaking changes
- You can now rely on `./config.json` in your repo when running globally or via npx
