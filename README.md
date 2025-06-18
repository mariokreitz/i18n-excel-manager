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
- Target Excel file: `./translations.xlsx`
- Sheet name: `Translations`

### Command line parameters

#### Convert i18n files to Excel

```bash
i18n-excel-manager -t "./locales" "./translations.xlsx"
```

or:

```bash
i18n-excel-manager --to-excel "./locales" "./translations.xlsx"
```

#### Convert Excel file back to i18n

```bash
i18n-excel-manager -f "./translations.xlsx" "./locales"
```

or:

```bash
i18n-excel-manager --from-excel "./translations.xlsx" "./locales"
```

#### Dry-Run & Report

With the `--dry-run` option, no files are written. Instead, a detailed report is output to the console, checking the following points:

- Missing translations per language
- Duplicate keys
- Consistency of placeholders (e.g. `{name}`, `{count}`) between languages

Example:

```bash
i18n-excel-manager -t "./locales" "./translations.xlsx" --dry-run
```

### Show help

```bash
i18n-excel-manager --help
```

## Placeholder check

The tool detects placeholders like `{name}` or `{count}` in the translation texts and checks whether they are consistently present in all language versions of a translation. If there are discrepancies, a warning appears in the report.

Example:

| Key               | de                                      | en                              |
|-------------------|-----------------------------------------|---------------------------------|
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

| Key           | de      | en       | fr         |
|---------------|---------|----------|------------|
| common.yes    | Ja      | Yes      | Oui        |
| common.no     | Nein    | No       | Non        |
| login.title   | Anmelden| Login    | Connexion  |
| login.submit  | Einloggen| Sign in | Connecter  |

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
