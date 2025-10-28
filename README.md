# i18n-excel-manager

[![CI](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![npm downloads](https://img.shields.io/npm/dm/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![codecov](https://codecov.io/gh/mariokreitz/i18n-excel-manager/branch/main/graph/badge.svg)](https://codecov.io/gh/mariokreitz/i18n-excel-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="assets/logo.png" alt="i18n-excel-manager logo" width="320" />
</p>

<h2 align="center">i18n-excel-manager</h2>
<p align="center"><b>Effortless conversion between i18n JSON files and Excel for Angular and modern web projects.</b></p>

---

## ✨ Features

- **Bidirectional Conversion**: Convert i18n JSON files to Excel and vice versa.
- **Interactive CLI**: User-friendly menu-driven interface.
- **Initialization**: Quickly scaffold i18n folders and starter JSON files in fresh projects.
- **Dry-Run Mode**: Preview changes without writing files.
- **Placeholder Validation**: Detect inconsistent placeholders across languages.
- **Language Mapping**: Use full language names in Excel headers.
- **Duplicate Detection**: Identify and handle duplicate keys.
- **Path Safety**: Prevent directory traversal attacks.
- **Modern CLI**: Short and long flags, comprehensive help.
- **Node.js API**: Programmatic access for integrations.

---

## Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage](#-usage)
  - [CLI](#cli)
  - [API](#api)
- [Angular Integration](#-angular-integration)
- [Configuration](#-configuration)
- [Options](#-options)
- [Migration Guide](#-migration-guide)
- [Error Handling](#-error-handling)
- [Architecture](#-architecture)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📦 Installation

### Requirements

- Node.js >= 18
- Tested on Node.js 18.x, 20.x, and 22.x

### Global Installation (Recommended)

```bash
npm install -g i18n-excel-manager
```

### Local Installation (as dev dependency)

```bash
npm install --save-dev i18n-excel-manager
```

---

## 🚀 Quick Start

1. Install globally: `npm install -g i18n-excel-manager`
2. Initialize a new project (creates `public/assets/i18n` with starter files):

```bash
i18n-excel-manager init --output ./public/assets/i18n --languages en,de,fr
```

3. Convert JSON to Excel: `i18n-excel-manager i18n-to-excel --input ./public/assets/i18n --output translations.xlsx`
4. Edit the Excel file with your translations.
5. Convert back to JSON: `i18n-excel-manager excel-to-i18n --input translations.xlsx --output ./public/assets/i18n`

Tip: Running `i18n-excel-manager` without arguments opens an interactive menu. If no i18n files are detected in the
default directory, you'll be prompted to initialize them.

---

## 🛠️ Usage

### CLI

#### Interactive Mode

Run without arguments for a guided experience:

```bash
i18n-excel-manager
```

If the default i18n folder (from `config.json` defaults) is missing or empty, the CLI will offer to run initialization.

#### Initialize i18n Files (New Projects)

Create the default i18n directory and language files with minimal content. Existing files are never overwritten.

```bash
i18n-excel-manager init \
  --output ./public/assets/i18n \
  --languages en,de,fr
```

- Use `--dry-run` to preview which files would be created.
- Omit `--languages` to choose interactively from configured languages.

#### Convert JSON to Excel

```bash
i18n-excel-manager i18n-to-excel --input ./public/assets/i18n --output translations.xlsx
```

#### Convert Excel to JSON

```bash
i18n-excel-manager excel-to-i18n --input translations.xlsx --output ./public/assets/i18n
```

#### Dry Run

Preview changes without writing files:

```bash
i18n-excel-manager i18n-to-excel --dry-run --input ./public/assets/i18n
```

### API

```javascript
import { convertToExcel, convertToJson } from 'i18n-excel-manager';

// Convert JSON to Excel
await convertToExcel('./public/assets/i18n', 'translations.xlsx', {
  sheetName: 'Translations',
  dryRun: false,
  languageMap: { en: 'English', de: 'Deutsch' },
});

// Convert Excel to JSON
await convertToJson('translations.xlsx', './public/assets/i18n', {
  sheetName: 'Translations',
  failOnDuplicates: false,
});
```

---

## 🔧 Angular Integration

This tool is designed to work seamlessly with Angular's i18n workflow. Angular typically stores translation files in
`public/assets/i18n/` with filenames matching language codes (e.g., `en.json`, `de.json`).

### Project Structure

A typical Angular project structure for i18n:

```
my-angular-app/
├── public/
│   └── assets/
│       └── i18n/
│           ├── en.json
│           ├── de.json
│           └── fr.json
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   └── app.config.ts
│   └── locales/
│       └── messages.xlf  // For Angular i18n extraction
└── angular.json
```

### Generating Translation Files

Use the CLI to convert Excel files to Angular-compatible JSON:

```bash
# Convert Excel to Angular i18n files
i18n-excel-manager excel-to-i18n \
  --input ./translations.xlsx \
  --output ./public/assets/i18n \
  --fail-on-duplicates
```

This creates `en.json`, `de.json`, etc. in `public/assets/i18n/`.

### Loading Translations in Angular

Configure Angular to load translations from the assets directory. In `src/app/app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'en',
    }),
  ],
};
```

In components, use translations:

```typescript
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  template: `
    <h1>{{ 'app.title' | translate }}</h1>
    <p>{{ 'app.welcome' | translate }}</p>
  `,
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('en');
    this.translate.use('en'); // or detect from user preference
  }
}
```

### Configuration

Ensure `public/assets/i18n/` is included in `angular.json`:

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "options": {
            "assets": ["public", "public/assets/i18n"]
          }
        }
      }
    }
  }
}
```

### Best Practices

- **Version Control**: Commit translation files to git for version history.
- **CI/CD Integration**: Automate translation updates in your build pipeline.
- **Language Detection**: Use browser language or user preferences to set the default language.
- **Lazy Loading**: Load translations on-demand for better performance.
- **Fallbacks**: Configure fallback languages for missing translations.
- **Validation**: Use `--dry-run` to validate translations before deployment.

For Angular's built-in i18n, extract messages first:

```bash
ng extract-i18n --output-path src/locales
```

Then use this tool to convert the XLIFF files to Excel for translators, and back to JSON for Angular consumption.

---

## ⚙️ Configuration

Create a `config.json` file for custom settings. The CLI will automatically load `./config.json` from your current
working directory (CWD) when present. You can also pass a custom path with `--config path/to/config.json`.

```json
{
  "languages": {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français"
  },
  "defaults": {
    "sourcePath": "./public/assets/i18n",
    "targetFile": "translations.xlsx",
    "targetPath": "./public/assets/i18n",
    "sheetName": "Translations"
  }
}
```

Precedence:

- CLI flags > config.defaults > built-in defaults.
- languageMap precedence: CLI > config.languages > runtime config.

Examples:

- Autoload from CWD: `i18n-excel-manager i18n-to-excel --dry-run`
- Custom path: `i18n-excel-manager i18n-to-excel --config ./my-config.json --dry-run`
- Flags override: `i18n-excel-manager i18n-to-excel -i ./custom -o out.xlsx --dry-run`

Note: For safety, `--config` must point within the current working directory.

---

## 📋 Options

### init Command

| Option               | Short | Description                                  | Default               |
| -------------------- | ----- | -------------------------------------------- | --------------------- |
| `--output <path>`    | `-o`  | Target directory for i18n JSON files         | `public/assets/i18n`  |
| `--languages <list>` | `-l`  | Comma-separated language codes to initialize | prompts interactively |
| `--dry-run`          | `-d`  | Simulate only, do not write files            | `false`               |
| `--config <file>`    |       | Path to config file                          | `./config.json`       |
| `--help`             | `-h`  | Show help                                    |                       |
| `--version`          | `-V`  | Show version                                 |                       |

Notes:

- Existing files are never overwritten; they are reported as "Skipped".
- When `--languages` is omitted, a checkbox prompt is shown with languages from your `config.json`.

### i18n-to-excel Command

| Option                | Short | Description                                  | Default                  |
| --------------------- | ----- | -------------------------------------------- | ------------------------ |
| `--input <path>`      | `-i`  | Path to directory containing i18n JSON files | `public/assets/i18n`     |
| `--output <file>`     | `-o`  | Path for the output Excel file               | `dist/translations.xlsx` |
| `--sheet-name <name>` | `-s`  | Excel worksheet name                         | `Translations`           |
| `--dry-run`           | `-d`  | Simulate only, do not write files            | `false`                  |
| `--no-report`         |       | Skip generating translation report           | `false`                  |
| `--config <file>`     |       | Path to config file                          | `./config.json`          |
| `--help`              | `-h`  | Show help                                    |                          |
| `--version`           | `-V`  | Show version                                 |                          |

### excel-to-i18n Command

| Option                 | Short | Description                          | Default                  |
| ---------------------- | ----- | ------------------------------------ | ------------------------ |
| `--input <file>`       | `-i`  | Path to Excel file                   | `dist/translations.xlsx` |
| `--output <path>`      | `-o`  | Target directory for i18n JSON files | `locales`                |
| `--sheet-name <name>`  | `-s`  | Excel worksheet name                 | `Translations`           |
| `--dry-run`            | `-d`  | Simulate only, do not write files    | `false`                  |
| `--fail-on-duplicates` |       | Exit with error on duplicate keys    | `false`                  |
| `--config <file>`      |       | Path to config file                  | `./config.json`          |
| `--help`               | `-h`  | Show help                            |                          |
| `--version`            | `-V`  | Show version                         |                          |

### Config File Precedence

CLI options take precedence over config file settings. The config file is merged with defaults, then CLI options
override any conflicting values.

Example config file (`my-config.json`):

```json
{
  "languages": {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français"
  },
  "defaults": {
    "sourcePath": "./src/assets/i18n",
    "targetFile": "./translations.xlsx",
    "targetPath": "./src/assets/i18n",
    "sheetName": "Translations"
  }
}
```

Usage: `i18n-excel-manager i18n-to-excel --config my-config.json --input ./custom/path`

---

## 🔄 Migration Guide

### From v1.x to v2.x

In v2.x, we removed legacy CLI command aliases to enforce explicit command names for better clarity and consistency.

#### Breaking Changes

- Removed `to-excel` alias for `i18n-to-excel` command.
- Removed `to-json` alias for `excel-to-i18n` command.

#### Migration Steps

1. Update your scripts to use the full command names:
   - Change `i18n-excel-manager to-excel ...` to `i18n-excel-manager i18n-to-excel ...`
   - Change `i18n-excel-manager to-json ...` to `i18n-excel-manager excel-to-i18n ...`
2. If you were using the aliases in CI/CD pipelines or automation scripts, update them accordingly.
3. No other changes are required; all other options and functionality remain the same.

If you encounter issues, use `i18n-excel-manager --help` to see available commands.

---

## 🚨 Error Handling

The tool provides clear error messages for common issues:

- **Missing files**: "File does not exist: path"
- **Invalid JSON**: "Invalid JSON in file: error message"
- **Duplicate keys**: "Duplicate keys detected in Excel: key1, key2"
- **Invalid language codes**: "Invalid language code: xyz"
- **Unsafe paths**: "Unsafe output path: path"

Use `--dry-run` to validate before actual conversion.

### Troubleshooting

- **Permission errors**: Ensure you have write access to the output directory.
- **Invalid language codes**: Use standard ISO language codes (e.g., `en`, `de`, `fr`).
- **Missing placeholders**: Check for consistent placeholder usage across languages.
- **Large files**: For very large translation files, consider splitting into multiple sheets.

---

## 🏗️ Architecture

- **Modular Design**: Separate concerns for I/O, core logic, and reporting.
- **Pure Functions**: Core business logic is testable and side-effect free.
- **Validation**: Input validation at all boundaries.
- **Extensibility**: Pluggable reporters and configurable I/O layers.

Project structure:

- `src/app/`: Application logic
- `src/core/`: Business rules and data processing
- `src/io/`: File system and Excel operations
- `src/reporters/`: Output formatting

---
