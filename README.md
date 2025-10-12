# i18n-excel-manager

[![CI](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![npm downloads](https://img.shields.io/npm/dm/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="assets/logo.png" alt="i18n-excel-manager logo" width="320" />
</p>

<h2 align="center">i18n-excel-manager</h2>
<p align="center"><b>Effortless conversion between i18n JSON files and Excel for Angular and modern web projects.</b></p>

---

## ✨ Features

- **i18n → Excel**: Convert multiple i18n JSON files (as used by [ngx-translate](https://github.com/ngx-translate/core))
  into a single, well-structured Excel file for translators.
- **Excel → i18n**: Convert an Excel file back into language-specific JSON files for your app.
- **Interactive CLI**: User-friendly, menu-driven interface for non-technical users.
- **Dry-Run & Reporting**: Use `--dry-run` to preview missing translations, duplicates, and placeholder inconsistencies
  without writing files.
- **Placeholder Consistency**: Detects and reports inconsistent placeholders (e.g., `{name}`, `{count}`) across
  languages.
- **Customizable Sheet Name**: Set the Excel worksheet name with `--sheet-name`.
- **Language Mapping**: Display full language names in Excel instead of codes.
- **Modern CLI Options**: All options available as short and long flags (e.g., `-d`/`--dry-run`).
- **No File Written in Dry-Run**: Guaranteed by CLI logic.
- **Supports Both Interactive and Direct CLI Usage**.
- **Angular Defaults**: Defaults to `public/assets/i18n` for source files, matching Angular's recommended i18n
  structure.

---

## ⚙️ Requirements

- Node.js >= 18
  - CI runs on Node 18.x, 20.x, and 22.x.

---

## 🔄 CI/CD

This repository uses GitHub Actions for continuous integration and deployment:

- **CI Workflow** (`ci.yml`): Runs on every push and pull request to `main`, plus weekly
  - Tests across Node.js 18.x, 20.x, 22.x
  - Linting with ESLint
  - Code formatting check with Prettier
  - Unit tests with coverage (minimum 85%)
  - Security audit with npm audit
  - CodeQL security analysis
  - Coverage artifacts uploaded for review

- **Publish Workflow** (`publish.yml`): Triggers on GitHub releases
  - Publishes package to npm registry
  - Sends Discord notification

- **Dependabot Auto-Merge** (`dependabot-auto-merge.yml`): Auto-merges patch updates from Dependabot

All workflows must pass before merging PRs. See `.github/workflows/` for details.

---

## 🚀 Installation

### Global (recommended)

```bash
npm install -g i18n-excel-manager
```

### Local (as a dev dependency)

```bash
npm install --save-dev i18n-excel-manager
```

---

## 🛠️ Usage

### Interactive Mode

Launch the tool without arguments for a guided, menu-driven experience:

```bash
i18n-excel-manager
```

### CLI Commands

#### Convert i18n JSON → Excel

```bash
i18n-excel-manager i18n-to-excel --input ./public/assets/i18n --output ./translations.xlsx --sheet-name Translations
```

#### Convert Excel → i18n JSON

```bash
i18n-excel-manager excel-to-i18n --input ./translations.xlsx --output ./public/assets/i18n --sheet-name Translations
```

#### Strict duplicate handling (fail on duplicates)

```bash
i18n-excel-manager excel-to-i18n -i ./translations.xlsx -o ./public/assets/i18n --fail-on-duplicates
```

#### Dry-Run (no files written, only report)

```bash
i18n-excel-manager i18n-to-excel --dry-run
```

#### Disable Report

```bash
i18n-excel-manager i18n-to-excel --no-report
```

---

## 💡 Examples

```bash
# Convert i18n JSON to Excel (Angular default paths)
i18n-excel-manager i18n-to-excel

# Convert Excel to i18n JSON (with custom sheet name)
i18n-excel-manager excel-to-i18n -i translations.xlsx -o ./public/assets/i18n -s MySheet

# Dry-Run with report
i18n-excel-manager i18n-to-excel --dry-run
```

---

## 📦 Node.js API

i18n-excel-manager exposes a Node API along with the CLI. Import functions from the package root:

```js
import { convertToExcel, convertToJson } from 'i18n-excel-manager';

await convertToExcel('public/assets/i18n', 'translations.xlsx', {
  dryRun: true,
});
await convertToJson('translations.xlsx', 'public/assets/i18n', {
  sheetName: 'MySheet',
});
```

Note: Importing the CLI entrypoint (`./cli.js`) will not auto-run the interactive UI. The CLI only runs when executed
directly (e.g., `i18n-excel-manager` or `node cli.js`).

---

## 🔒 Security & Behavior Notes

- Path safety: When converting Excel → i18n JSON, language column headers are validated and output file paths are
  constrained to the selected output directory. Invalid language codes or unsafe paths are rejected to prevent path
  traversal.
- Duplicate keys (Excel): If an Excel sheet contains duplicate values in the "Key" column, they are detected and a
  warning is printed. The conversion still proceeds by default; use dry-run to review and fix duplicates before writing
  files. For stricter behavior, pass `--fail-on-duplicates` to cause conversion to fail when duplicates are present.

---

## 🧪 Development & Testing

```bash
npm install
npm test
```

---

## 📝 License

MIT
