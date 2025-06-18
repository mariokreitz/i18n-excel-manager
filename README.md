# i18n-excel-manager

[![Tests](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml/badge.svg)](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![npm downloads](https://img.shields.io/npm/dm/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool for easy conversion of i18n JSON files to Excel and back. Perfect for translation workflows in international projects.

![i18n-excel-manager Logo](https://raw.githubusercontent.com/mariokreitz/i18n-excel-manager/refs/heads/main/assets/logo.png)

## Features

- **i18n to Excel**: Converts localized JSON files into a clear Excel format
- **Excel to i18n**: Converts edited Excel files back into localized JSON files
- **Interactive CLI**: User-friendly interface with colored output
- **Nested translations**: Supports complex translation structures
- **Dry-Run & Report**: With the `--dry-run` option, no files are written, but a report on missing translations, duplicate keys, and placeholder consistency is generated
- **Placeholder check**: Detects and checks placeholders like `{name}` or `{count}` for consistency across all languages
- **Configurable sheet names**: Excel sheet name can be set via option
- **Language display names**: Shows full language names in Excel sheets instead of just language codes

## Installation

### Install globally (recommended)

```bash
npm install -g i18n-excel-manager
```

### Local installation in a project

```bash
npm install i18n-excel-manager --save-dev
```

## Usage

### Interactive mode

Start the tool without parameters for interactive mode:

```bash
i18n-excel-manager
```

Follow the menu instructions to configure your conversion.

**Default paths in the CLI:**
- Path to i18n files: `public/assets/i18n` (Angular default)
- Target Excel file: `dist/translations.xlsx`
- Sheet name: `Translations`

### Command line usage

#### Convert i18n files to Excel

```bash
# Using command syntax (recommended)
i18n-excel-manager i18n-to-excel --input ./locales --output ./translations.xlsx

# Short command aliases
i18n-excel-manager to-excel -i ./locales -o ./translations.xlsx

# Legacy syntax (deprecated)
i18n-excel-manager --to-excel --input ./locales --output ./translations.xlsx
```

#### Convert Excel file back to i18n

```bash
# Using command syntax (recommended)
i18n-excel-manager excel-to-i18n --input ./translations.xlsx --output ./locales

# Short command aliases
i18n-excel-manager to-json -i ./translations.xlsx -o ./locales

# Legacy syntax (deprecated)
i18n-excel-manager --from-excel --input ./translations.xlsx --output ./locales
```

## Command Line Examples

### i18n-to-excel Command (JSON → Excel)

#### Basic usage with default values
```bash
# Use default directories and settings
i18n-excel-manager i18n-to-excel
```

#### Using command alias
```bash
# 'to-excel' is an alias for 'i18n-to-excel'
i18n-excel-manager to-excel
```

#### Custom input directory
```bash
# Specify source directory for i18n JSON files
i18n-excel-manager i18n-to-excel --input ./src/i18n
# Short option syntax
i18n-excel-manager i18n-to-excel -i ./src/i18n
```

#### Custom output file
```bash
# Specify output Excel file location
i18n-excel-manager i18n-to-excel --output ./translations/project.xlsx
# Short option syntax
i18n-excel-manager i18n-to-excel -o ./translations/project.xlsx
```

#### Custom Excel sheet name
```bash
# Use a custom name for the Excel worksheet
i18n-excel-manager i18n-to-excel --sheet-name "MyProject"
# Short option syntax
i18n-excel-manager i18n-to-excel -s "MyProject"
```

#### Dry run (validation without file creation)
```bash
# Check translations without creating files
i18n-excel-manager i18n-to-excel --dry-run
# Short option syntax
i18n-excel-manager i18n-to-excel -d
```

#### Skip report generation
```bash
# Skip generating the missing translations report
i18n-excel-manager i18n-to-excel --no-report
```

#### Combined options example
```bash
# Using multiple options together
i18n-excel-manager i18n-to-excel -i ./frontend/i18n -o ./reports/translations.xlsx -s "Frontend" -d
```

### excel-to-i18n Command (Excel → JSON)

#### Basic usage with default values
```bash
# Use default files and settings
i18n-excel-manager excel-to-i18n
```

#### Using command alias
```bash
# 'to-json' is an alias for 'excel-to-i18n'
i18n-excel-manager to-json
```

#### Custom input Excel file
```bash
# Specify source Excel file
i18n-excel-manager excel-to-i18n --input ./my-translations.xlsx
# Short option syntax
i18n-excel-manager excel-to-i18n -i ./my-translations.xlsx
```

#### Custom output directory
```bash
# Specify output directory for JSON files
i18n-excel-manager excel-to-i18n --output ./src/assets/i18n
# Short option syntax
i18n-excel-manager excel-to-i18n -o ./src/assets/i18n
```

#### Custom Excel sheet name
```bash
# Use a specific sheet from the Excel file
i18n-excel-manager excel-to-i18n --sheet-name "UI Texts"
# Short option syntax
i18n-excel-manager excel-to-i18n -s "UI Texts"
```

#### Dry run (validation without file creation)
```bash
# Preview conversion without writing files
i18n-excel-manager excel-to-i18n --dry-run
# Short option syntax
i18n-excel-manager excel-to-i18n -d
```

#### Combined options example
```bash
# Using multiple options together
i18n-excel-manager excel-to-i18n -i ./external/client-translations.xlsx -o ./src/i18n -s "Final" 
```

### Legacy Command Syntax

#### Convert i18n to Excel (legacy)
```bash
i18n-excel-manager --to-excel --input ./locales --output ./result.xlsx --sheet-name "Translations" --dry-run
```

#### Convert Excel to i18n (legacy)
```bash
i18n-excel-manager --from-excel --input ./result.xlsx --output ./new-locales --sheet-name "Translations"
```

### Show help

```bash
# General help
i18n-excel-manager --help

# Command-specific help
i18n-excel-manager i18n-to-excel --help
i18n-excel-manager excel-to-i18n --help
```

## Configuration

The tool uses a `config.json` file to define language mappings and default settings:

```json
{
  "languages": {
    "de": "German",
    "en": "English",
    "fr": "French"
    // ... more languages
  },
  "defaults": {
    "sourcePath": "public/assets/i18n",
    "targetFile": "dist/translations.xlsx",
    "targetPath": "locales",
    "sheetName": "Translations"
  }
}
```

In the Excel sheet, the column headers will display the full language names (e.g., "German" instead of "de"), making it easier for translators to understand which language they're working with.

## Placeholder check

The tool detects placeholders like `{name}` or `{count}` in the translation texts and checks whether they are consistently present in all language versions of a translation. If there are discrepancies, a warning appears in the report.

Example:

| Key               | German                                  | English                          |
|-------------------|----------------------------------------|---------------------------------|
| greeting.message  | Hallo {name}, du hast {count} Nachrichten. | Hello {name}, you have messages. |

The report will indicate that `{count}` is missing in the English translation.

## File formats

### Input JSON format (i18n)

```json
{
  "common": {
    "yes": "Ja",
    "no": "Nein"
  },
  "login": {
    "title": "Anmelden",
    "submit": "Einloggen"
  }
}
```

### Output Excel format

The tool creates an Excel file with the following structure:

| Key           | German   | English   | French      |
|---------------|----------|-----------|------------|
| common.yes    | Ja       | Yes       | Oui        |
| common.no     | Nein     | No        | Non        |
| login.title   | Anmelden | Login     | Connexion  |
| login.submit  | Einloggen| Sign in   | Connecter  |

## Tests & Linting

- **Run tests:**  
  ```bash
  npm test
  ```
- **Linting:**  
  ```bash
  npm run lint
  ```
- Supported Node.js version: >= 14.16.0

## Contribution

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the process.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## Questions & Issues

For questions, bugs, or feature requests, please create an [issue on GitHub](https://github.com/mariokreitz/i18n-excel-manager/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Mario Kreitz - [GitHub profile](https://github.com/mariokreitz)
