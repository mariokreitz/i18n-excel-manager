# i18n-excel-manager

[![CI](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml/badge.svg)](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml)
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

#### Dry-Run (no files written, only report)

```bash
i18n-excel-manager i18n-to-excel --dry-run
```

#### Disable Report

```bash
i18n-excel-manager i18n-to-excel --no-report
```

---

## ⚙️ Options

| Option       | Alias | Description                               |
|--------------|-------|-------------------------------------------|
| --input      | -i    | Path to i18n JSON folder or Excel file    |
| --output     | -o    | Output path for Excel file or i18n folder |
| --sheet-name | -s    | Name of the Excel worksheet               |
| --dry-run    | -d    | Simulate only, do not write files         |
| --no-report  |       | Suppress translation report               |

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

```js
import { convertToExcel, convertToJson } from 'i18n-excel-manager';

await convertToExcel('public/assets/i18n', 'translations.xlsx', { dryRun: true });
await convertToJson('translations.xlsx', 'public/assets/i18n', { sheetName: 'MySheet' });
```

---

## 🧪 Development & Testing

```bash
npm install
npm test
```

---

## 📝 License

MIT
