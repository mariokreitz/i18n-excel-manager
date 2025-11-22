# v2.1.2 (2025-11-22)

## Highlights

- Inquirer updated to `13.0.1` with new API (future migration to `@inquirer/core` planned)
- ESLint 9 migration with flat config (`eslint.config.js`)
- Upgraded `eslint-plugin-sonarjs` to v3.0.5 for ESLint 9 compatibility
- Comprehensive JSDoc improvements across all modules
- Code refactoring and quality improvements

## Upgrade Notes

- No breaking changes
- ESLint configuration modernized but rule set preserved
- Node.js >= 20 required (aligned with CI test matrix)

---

# v2.1.0 (2025-10-28)

Highlights

- Config autoload from CWD (config optional, respected by default)
- Precedence clarified: CLI > config.defaults > built-ins; languageMap: CLI > config.languages > runtime
- Additional tests and minimal README update

Upgrade Notes

- No breaking changes
- You can now rely on `./config.json` in your repo when running globally or via npx
