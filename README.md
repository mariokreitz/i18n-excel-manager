# i18n-excel-manager

[![Tests](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml/badge.svg)](https://github.com/mariokreitz/i18n-excel-manager/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![npm downloads](https://img.shields.io/npm/dm/i18n-excel-manager.svg?style=flat)](https://www.npmjs.com/package/i18n-excel-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Ein Kommandozeilen-Tool zur einfachen Konvertierung von i18n-JSON-Dateien zu Excel und zurück. Perfekt für Übersetzungsprozesse in internationalen Projekten.

![i18n-excel-manager Logo](https://raw.githubusercontent.com/mariokreitz/i18n-excel-manager/refs/heads/main/assets/logo.png)

## Funktionen

- **i18n zu Excel**: Konvertiert lokalisierte JSON-Dateien in ein übersichtliches Excel-Format
- **Excel zu i18n**: Wandelt bearbeitete Excel-Dateien zurück in lokalisierte JSON-Dateien
- **Interaktives CLI**: Benutzerfreundliches Interface mit farbiger Anzeige
- **Verschachtelte Übersetzungen**: Unterstützt komplexe Übersetzungsstrukturen

## Installation

### Global installieren (empfohlen)

```bash
npm install -g i18n-excel-manager
```

### Lokal in einem Projekt

```bash
npm install i18n-excel-manager --save-dev
```

## Verwendung

### Interaktiver Modus

Starten Sie das Tool ohne Parameter für den interaktiven Modus:

```bash
i18n-excel-manager
```

Folgen Sie den Anweisungen im Menü, um Ihre Konvertierung zu konfigurieren.

### Kommandozeilenparameter

#### i18n-Dateien nach Excel konvertieren

```bash
i18n-excel-manager -t "./locales" "./translations.xlsx"
```

oder:

```bash
i18n-excel-manager --to-excel "./locales" "./translations.xlsx"
```

#### Excel-Datei zurück zu i18n konvertieren

```bash
i18n-excel-manager -f "./translations.xlsx" "./locales"
```

oder:

```bash
i18n-excel-manager --from-excel "./translations.xlsx" "./locales"
```

### Hilfe anzeigen

```bash
i18n-excel-manager --help
```

## Dateiformate

### Eingabe-JSON-Format (i18n)

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

### Ausgabe-Excel-Format

Das Tool erstellt eine Excel-Datei mit folgender Struktur:

| Key           | de      | en       | fr         |
|---------------|---------|----------|------------|
| common.yes    | Ja      | Yes      | Oui        |
| common.no     | Nein    | No       | Non        |
| login.title   | Anmelden| Login    | Connexion  |
| login.submit  | Einloggen| Sign in | Connecter  |

## Beitrag

Beiträge sind willkommen! Bitte lesen Sie [CONTRIBUTING.md](CONTRIBUTING.md) für Details zum Prozess.

1. Fork des Repositories
2. Feature-Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request öffnen

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

## Autor

Mario Kreitz - [GitHub-Profil](https://github.com/mariokreitz)