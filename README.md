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

### Core Conversion

- **Bidirectional Conversion**: Convert i18n JSON files to Excel and vice versa.
- **Nested Key Support**: Handles deeply nested translation structures with dot-notation flattening.
- **Language Mapping**: Use full language names in Excel headers (e.g., "German" instead of "de").
- **Placeholder Validation**: Detect inconsistent placeholders (e.g., `{{value}}`) across languages.
- **Duplicate Detection**: Identify and handle duplicate translation keys.

### Codebase Analysis

- **Missing Key Detection**: Find translation keys used in code but missing from JSON files.
- **Unused Key Detection**: Identify translation keys defined in JSON but never used in code.
- **Flexible Patterns**: Scan any file types using customizable glob patterns.
- **Multi-file Reports**: Get analysis reports for each language file separately.

### AI-Powered Translation

- **Gemini Integration**: Auto-translate missing values using Google's Gemini AI.
- **Placeholder Preservation**: AI preserves `{{placeholders}}`, HTML tags, and formatting.
- **Multiple Models**: Choose from `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, or preview models like
  `gemini-3-flash-preview`.
- **Batch Processing**: Efficiently translates multiple strings in a single API call.

### Developer Experience

- **Interactive CLI**: User-friendly menu-driven interface for all operations.
- **Dry-Run Mode**: Preview changes without writing files.
- **Initialization**: Quickly scaffold i18n folders and starter JSON files.
- **Path Safety**: Prevent directory traversal attacks with path validation.
- **Node.js API**: Programmatic access for CI/CD integrations.

---

## 📑 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage](#️-usage)
  - [Interactive Mode](#interactive-mode)
  - [Initialize i18n Files](#initialize-i18n-files)
  - [Convert JSON to Excel](#convert-json-to-excel)
  - [Convert Excel to JSON](#convert-excel-to-json)
  - [Analyze Codebase](#analyze-codebase)
  - [AI Auto-Translation](#ai-auto-translation)
- [API](#-api)
- [Angular Integration](#-angular-integration)
- [Configuration](#️-configuration)
- [CLI Options Reference](#-cli-options-reference)
- [Migration Guide](#-migration-guide)
- [Error Handling](#-error-handling)
- [Architecture](#️-architecture)
- [Known Issues](#️-known-issues)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📦 Installation

### Requirements

- Node.js >= 20
- Tested on Node.js 20.x, 22.x, and 24.x

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

### The Easiest Way: Interactive Mode

Just run the CLI without any arguments and let the interactive menu guide you:

```bash
npm install -g i18n-excel-manager
i18n-excel-manager
```

The interactive menu will walk you through all available features with sensible defaults - no need to memorize commands
or flags!

> 💡 **New to i18n-excel-manager?** Start with the interactive mode. It detects your project structure and offers to
> initialize i18n files if needed.

---

### CLI Commands (for automation & scripts)

For CI/CD pipelines or scripting, use the CLI commands directly:

1. **Initialize a new project** (creates `public/assets/i18n` with starter files):

   ```bash
   i18n-excel-manager init --output ./public/assets/i18n --languages en,de,fr
   ```

2. **Convert JSON to Excel:**

   ```bash
   i18n-excel-manager i18n-to-excel --input ./public/assets/i18n --output translations.xlsx
   ```

3. **Edit the Excel file** with your translations.

4. **Convert back to JSON:**

   ```bash
   i18n-excel-manager excel-to-i18n --input translations.xlsx --output ./public/assets/i18n
   ```

5. **Analyze your codebase** for missing/unused keys:

   ```bash
   i18n-excel-manager analyze --input ./public/assets/i18n --pattern "src/**/*.{ts,html}"
   ```

6. **Auto-translate missing values** with AI:

   ```bash
   i18n-excel-manager analyze --translate --input translations.xlsx --api-key YOUR_GEMINI_KEY
   ```

---

## 🛠️ Usage

### Interactive Mode

Run without arguments for a guided experience:

```bash
i18n-excel-manager
```

The interactive menu provides access to all features:

- Convert i18n files to Excel
- Convert Excel to i18n files
- Analyze Codebase (Missing/Unused keys)
- AI Auto-Translate (Fill missing translations)
- Initialize i18n files

If the default i18n folder is missing or empty, the CLI will offer to initialize it.

### Initialize i18n Files

Create the i18n directory and language files with minimal starter content. Existing files are never overwritten.

```bash
i18n-excel-manager init \
  --output ./public/assets/i18n \
  --languages en,de,fr
```

**Options:**

- Use `--dry-run` to preview which files would be created.
- Omit `--languages` to choose interactively from configured languages.

**Example output:**

```
✔ Created: public/assets/i18n/en.json
✔ Created: public/assets/i18n/de.json
✔ Created: public/assets/i18n/fr.json
```

### Convert JSON to Excel

Convert your i18n JSON files into an Excel workbook for easy editing and collaboration:

```bash
i18n-excel-manager i18n-to-excel \
  --input ./public/assets/i18n \
  --output translations.xlsx \
  --sheet-name "Translations"
```

The Excel file will have:

- Column A: Translation keys (dot-notation)
- Subsequent columns: One per language (en, de, fr, etc.)

### Convert Excel to JSON

Convert an Excel workbook back to individual JSON files per language:

```bash
i18n-excel-manager excel-to-i18n \
  --input translations.xlsx \
  --output ./public/assets/i18n \
  --fail-on-duplicates
```

**Options:**

- `--fail-on-duplicates`: Exit with error if duplicate keys are detected.
- `--dry-run`: Preview changes without writing files.

### Analyze Codebase

Scan your source code to find translation keys that are missing from your JSON files or defined but never used:

```bash
i18n-excel-manager analyze \
  --input ./public/assets/i18n \
  --pattern "src/**/*.{ts,html}"
```

**What it detects:**

- **Missing keys**: Keys used in code (e.g., `{{ 'app.title' | translate }}`) but not defined in JSON.
- **Unused keys**: Keys defined in JSON but never referenced in your codebase.

**Supported patterns in code:**

```typescript
// Angular pipe syntax
{
    {
        'KEY.NAME' | translate
    }
}

// TranslateService methods
this.translate.get('KEY.NAME');
this.translate.instant('KEY.NAME');
this.translate.stream('KEY.NAME');

// Directive syntax
<div translate = "KEY.NAME" > </div>
< div [translate] = "'KEY.NAME'" > </div>
```

**Example output:**

```
Analysis Report:
Total Code Keys Found: 42

en.json
  Missing in JSON:
    - app.newFeature
    - errors.timeout
  Unused in Code:
    - legacy.oldButton

de.json
  All good!
```

### AI Auto-Translation

Automatically translate missing values in your Excel file using Google's Gemini AI:

```bash
i18n-excel-manager analyze \
  --translate \
  --input translations.xlsx \
  --api-key YOUR_GEMINI_API_KEY \
  --source-lang en \
  --model gemini-2.5-flash
```

**API Key Configuration:**

The API key can be provided in three ways (in order of precedence):

1. CLI flag: `--api-key YOUR_KEY`
2. Environment variable: `GEMINI_API_KEY`
3. Fallback environment variable: `I18N_MANAGER_API_KEY`

**Available Models:**

| Model                    | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `gemini-2.5-flash`       | Best price-performance, fast and efficient (default) |
| `gemini-2.5-flash-lite`  | Ultra fast, optimized for cost-efficiency            |
| `gemini-2.5-pro`         | Advanced thinking model for complex tasks            |
| `gemini-3-flash-preview` | Next-gen balanced model (preview)                    |
| `gemini-3-pro-preview`   | Most intelligent multimodal model (preview)          |

**Features:**

- Preserves placeholders like `{{value}}`, `{0}`, etc.
- Maintains HTML tags and formatting
- Processes translations in efficient batches
- Uses low temperature (0.2) for consistent results

**Interactive Mode:**

When using interactive mode, you'll be prompted for:

- Path to Excel file
- Source language code
- API key (can be masked input)
- Model selection

---

## 📚 API

Use the library programmatically in your Node.js applications:

```javascript
import {
  convertToExcel,
  convertToJson,
  analyze,
  translate,
} from 'i18n-excel-manager';
```

### convertToExcel(sourcePath, targetFile, options?)

Convert JSON localization files to an Excel workbook.

```javascript
await convertToExcel('./public/assets/i18n', 'translations.xlsx', {
  sheetName: 'Translations',
  dryRun: false,
  languageMap: { en: 'English', de: 'Deutsch' },
});
```

### convertToJson(sourceFile, targetPath, options?)

Convert an Excel workbook to JSON localization files.

```javascript
await convertToJson('translations.xlsx', './public/assets/i18n', {
  sheetName: 'Translations',
  failOnDuplicates: true,
});
```

### analyze(options)

Analyze the codebase for missing and unused translation keys.

```javascript
const report = await analyze({
  sourcePath: './public/assets/i18n',
  codePattern: 'src/**/*.{ts,html}',
});

console.log(`Total keys in code: ${report.totalCodeKeys}`);

for (const [file, result] of Object.entries(report.fileReports)) {
  console.log(`${file}:`);
  console.log(`  Missing: ${result.missing.join(', ')}`);
  console.log(`  Unused: ${result.unused.join(', ')}`);
}
```

**Return type:**

```typescript
{
    totalCodeKeys: number;
    fileReports: {
        [ filename
    :
        string
    ]:
        {
            missing: string[];  // Keys in code but not in JSON
            unused: string[];   // Keys in JSON but not in code
        }
    }
}
```

### translate(options)

Auto-translate missing values in an Excel workbook using Gemini AI.

```javascript
await translate({
  input: './translations.xlsx',
  apiKey: process.env.GEMINI_API_KEY,
  sourceLang: 'en',
  model: 'gemini-2.5-flash',
  languageMap: { en: 'English', de: 'German', fr: 'French' },
});
```

**Options:**

| Option        | Type   | Required | Default              | Description                           |
| ------------- | ------ | -------- | -------------------- | ------------------------------------- |
| `input`       | string | Yes      | -                    | Path to the Excel file                |
| `apiKey`      | string | Yes      | -                    | Gemini API key                        |
| `sourceLang`  | string | No       | `'en'`               | Source language code                  |
| `model`       | string | No       | `'gemini-2.5-flash'` | Gemini model to use                   |
| `languageMap` | object | No       | `{}`                 | Language code to display name mapping |

---

## 🔧 Angular Integration

This tool is designed to work seamlessly with Angular's i18n workflow. It's compatible with **Angular 17+** and \*
\*ngx-translate v17+\*\*.

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
│   └── app/
│       ├── app.component.ts
│       └── app.config.ts
└── angular.json
```

### Installation

Install ngx-translate packages:

```bash
npm install @ngx-translate/core @ngx-translate/http-loader
```

### App Configuration (Angular 20+ / ngx-translate v17+)

Configure the translation service in `src/app/app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'en',
      lang: 'en',
    }),
  ],
};
```

### Using Translations in Components

Use the `TranslatePipe` and `TranslateService` in your standalone components:

```typescript
import { Component, inject, signal } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'app.title' | translate }}</h1>
    <p>{{ 'app.welcome' | translate: { name: userName() } }}</p>

    <button (click)="switchLanguage('en')">English</button>
    <button (click)="switchLanguage('de')">Deutsch</button>
  `,
})
export class AppComponent {
  private translate = inject(TranslateService);

  userName = signal('User');

  switchLanguage(lang: string) {
    this.translate.use(lang);
  }
}
```

### Using the Translate Directive

For translating element content directly:

```typescript
import { Component, inject } from '@angular/core';
import { TranslateService, TranslateDirective } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  imports: [TranslateDirective],
  template: `
    <h1 [translate]="'header.title'"></h1>
    <p
      [translate]="'header.subtitle'"
      [translateParams]="{ version: '2.0' }"
    ></p>
  `,
})
export class HeaderComponent {
  private translate = inject(TranslateService);
}
```

### Translation File Format

Your JSON translation files should use nested or flat structures:

**Nested format (`en.json`):**

```json
{
  "app": {
    "title": "My Application",
    "welcome": "Welcome, {{name}}!"
  },
  "header": {
    "title": "Dashboard",
    "subtitle": "Version {{version}}"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
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

### Angular Configuration

Ensure `public/` is included in your `angular.json` assets:

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "options": {
            "assets": ["public"]
          }
        }
      }
    }
  }
}
```

### Best Practices

- **Version Control**: Commit translation files to git for version history.
- **CI/CD Integration**: Run `analyze` in your pipeline to catch missing translations.
- **Language Detection**: Use browser language or user preferences for initial language.
- **Lazy Loading**: Consider splitting translations per feature for large applications.
- **Validation**: Use `--dry-run` to validate translations before deployment.
- **Placeholder Consistency**: Use consistent placeholder names across all languages.

---

## ⚙️ Configuration

Create a `config.json` file for custom settings. The CLI automatically loads `./config.json` from your current working
directory when present.

```json
{
  "languages": {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    "es": "Spanish"
  },
  "defaults": {
    "sourcePath": "./public/assets/i18n",
    "targetFile": "translations.xlsx",
    "targetPath": "./public/assets/i18n",
    "sheetName": "Translations"
  }
}
```

### Configuration Precedence

CLI options take precedence over config file settings:

```
CLI flags > config.defaults > built-in defaults
```

Language map precedence:

```
CLI > config.languages > runtime config
```

### Usage Examples

```bash
# Autoload from CWD
i18n-excel-manager i18n-to-excel --dry-run

# Custom config path
i18n-excel-manager i18n-to-excel --config ./my-config.json --dry-run

# CLI flags override config
i18n-excel-manager i18n-to-excel -i ./custom -o out.xlsx --dry-run
```

> **Note:** For safety, `--config` must point within the current working directory.

---

## 📋 CLI Options Reference

### `init` Command

| Option               | Short | Description                                  | Default               |
| -------------------- | ----- | -------------------------------------------- | --------------------- |
| `--output <path>`    | `-o`  | Target directory for i18n JSON files         | `public/assets/i18n`  |
| `--languages <list>` | `-l`  | Comma-separated language codes to initialize | prompts interactively |
| `--dry-run`          | `-d`  | Simulate only, do not write files            | `false`               |
| `--config <file>`    |       | Path to config file                          | `./config.json`       |

### `i18n-to-excel` Command

| Option                | Short | Description                                  | Default                  |
| --------------------- | ----- | -------------------------------------------- | ------------------------ |
| `--input <path>`      | `-i`  | Path to directory containing i18n JSON files | `public/assets/i18n`     |
| `--output <file>`     | `-o`  | Path for the output Excel file               | `dist/translations.xlsx` |
| `--sheet-name <name>` | `-s`  | Excel worksheet name                         | `Translations`           |
| `--dry-run`           | `-d`  | Simulate only, do not write files            | `false`                  |
| `--no-report`         |       | Skip generating translation report           | `false`                  |
| `--config <file>`     |       | Path to config file                          | `./config.json`          |

### `excel-to-i18n` Command

| Option                 | Short | Description                          | Default                  |
| ---------------------- | ----- | ------------------------------------ | ------------------------ |
| `--input <file>`       | `-i`  | Path to Excel file                   | `dist/translations.xlsx` |
| `--output <path>`      | `-o`  | Target directory for i18n JSON files | `locales`                |
| `--sheet-name <name>`  | `-s`  | Excel worksheet name                 | `Translations`           |
| `--dry-run`            | `-d`  | Simulate only, do not write files    | `false`                  |
| `--fail-on-duplicates` |       | Exit with error on duplicate keys    | `false`                  |
| `--config <file>`      |       | Path to config file                  | `./config.json`          |

### `analyze` Command

| Option                 | Short | Description                                  | Default             |
| ---------------------- | ----- | -------------------------------------------- | ------------------- |
| `--input <path>`       | `-i`  | Path to directory containing i18n JSON files | -                   |
| `--pattern <glob>`     | `-p`  | Glob pattern for source code files           | `**/*.{html,ts,js}` |
| `--translate`          |       | Enable AI auto-translation mode              | `false`             |
| `--api-key <key>`      |       | Gemini API key (or use env vars)             | -                   |
| `--source-lang <code>` |       | Source language code for translation         | `en`                |
| `--model <model>`      |       | Gemini model to use                          | `gemini-2.5-flash`  |
| `--config <file>`      |       | Path to config file                          | `./config.json`     |

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

| Error Type             | Message Example                                            |
| ---------------------- | ---------------------------------------------------------- |
| Missing files          | `File does not exist: path`                                |
| Invalid JSON           | `Invalid JSON in file: error message`                      |
| Duplicate keys         | `Duplicate keys detected in Excel: key1, key2`             |
| Invalid language codes | `Invalid language code: xyz`                               |
| Unsafe paths           | `Unsafe output path: path`                                 |
| Missing API key        | `API Key is missing. Pass --api-key or set GEMINI_API_KEY` |

Use `--dry-run` to validate before actual conversion.

### Troubleshooting

| Issue                  | Solution                                                 |
| ---------------------- | -------------------------------------------------------- |
| Permission errors      | Ensure you have write access to the output directory     |
| Invalid language codes | Use standard ISO language codes (e.g., `en`, `de`, `fr`) |
| Missing placeholders   | Check for consistent placeholder usage across languages  |
| Large files            | Consider splitting into multiple sheets                  |
| API rate limits        | Use batch processing or add delays between requests      |

---

## 🏗️ Architecture

The project follows a modular architecture with clear separation of concerns:

```
src/
├── app/           # Application orchestration layer
│   ├── analyze.js     # Codebase analysis orchestrator
│   ├── convert.js     # Conversion orchestrator
│   └── translate.js   # AI translation orchestrator
├── core/          # Business logic (pure functions)
│   ├── analyzer.js    # Key extraction and comparison
│   ├── translator.js  # Gemini API integration
│   ├── excel/         # Excel data processing
│   ├── json/          # JSON structure handling
│   └── languages/     # Language mapping utilities
├── io/            # I/O operations
│   ├── excel.js       # Excel file read/write
│   ├── fs.js          # File system operations
│   └── config.js      # Configuration loading
├── cli/           # CLI interface
│   ├── commands.js    # Command handlers
│   ├── interactive.js # Interactive menu
│   └── init.js        # Initialization logic
└── reporters/     # Output formatting
    ├── console.js     # Console reporter
    └── json.js        # JSON reporter
```

### Design Principles

- **Modular Design**: Separate concerns for I/O, core logic, and reporting.
- **Pure Functions**: Core business logic is testable and side-effect free.
- **Dependency Injection**: I/O adapters are injectable for testing.
- **Validation**: Input validation at all boundaries.
- **Extensibility**: Pluggable reporters and configurable I/O layers.

---

## ⚠️ Known Issues

### Language Mapping After AI Auto-Translation

There is a known issue when exporting back from Excel to JSON after using the AI auto-translator where the language
mapping may not work properly.

**Workaround:** Restart `i18n-excel-manager` and try the export again.

This issue is being tracked and will be fixed in a future release.

---

## 🧑‍💻 Development

### Prerequisites

- Node.js >= 20
- npm or yarn

### Setup

```bash
git clone https://github.com/mariokreitz/i18n-excel-manager.git
cd i18n-excel-manager
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
# Check for lint errors
npm run lint

# Fix lint errors
npm run lint:fix
```

### Formatting

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md)
and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/mariokreitz">Mario Kreitz</a>
</p>
