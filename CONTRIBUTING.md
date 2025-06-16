# Beitragsrichtlinien

Vielen Dank für dein Interesse, zu i18n-excel-manager beizutragen! Jeder Beitrag wird geschätzt und hilft, dieses Tool zu verbessern.

## Code of Conduct

Dieses Projekt folgt einem Code of Conduct, der respektvolles und inklusives Verhalten fördert. Wir erwarten, dass alle Mitwirkenden diesen Code einhalten:

- Zeige Respekt und Höflichkeit gegenüber anderen Teilnehmern
- Akzeptiere konstruktive Kritik
- Konzentriere dich auf das, was für die Community am besten ist
- Vermeide persönliche Angriffe oder abfällige Kommentare

## Wie kann ich beitragen?

### Issues melden

- Verwende die Issue-Vorlage auf GitHub
- Überprüfe zuerst, ob das Issue bereits gemeldet wurde
- Stelle detaillierte Informationen zur Verfügung:
  - Schritte zur Reproduktion
  - Erwartetes vs. tatsächliches Verhalten
  - Version des Tools und Umgebung

### Pull Requests

1. Forke das Repository und erstelle einen Feature-Branch vom `main`-Branch
2. Halte deine Änderungen fokussiert – ein PR sollte eine einzelne Funktion oder einen Bugfix behandeln
3. Füge Tests für neue Funktionalitäten hinzu
4. Stelle sicher, dass alle Tests erfolgreich sind
5. Aktualisiere die Dokumentation entsprechend
6. Folge den Coding-Standards (siehe unten)

### Entwicklungsprozess

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/i18n-excel-manager.git
cd i18n-excel-manager

# Dependencies installieren
npm install

# Tests ausführen
npm test

# Linting ausführen
npm run lint
```

## Stilrichtlinien

### Code-Stil

- Wir verwenden ESLint und Prettier für die Code-Formatierung
- Befolge den etablierten Stil im vorhandenen Code
- Verwende aussagekräftige Variablen- und Funktionsnamen
- Dokumentiere neuen Code mit JSDoc-Kommentaren

### Commit-Nachrichten

Folge dem konventionellen Commit-Format:

```
<typ>(optional scope): <beschreibung>

[optional body]

[optional footer(s)]
```

Typen:
- `feat`: Eine neue Funktion
- `fix`: Eine Fehlerbehebung
- `docs`: Nur Dokumentationsänderungen
- `style`: Änderungen, die keinen Code beeinflussen (Formatierung, fehlende Semikolons, etc.)
- `refactor`: Codeänderung, die weder eine neue Funktion hinzufügt noch einen Fehler behebt
- `perf`: Codeänderung, die die Leistung verbessert
- `test`: Neue Tests oder Korrekturen an bestehenden Tests
- `build`: Änderungen am Build-System oder externen Abhängigkeiten
- `ci`: Änderungen an der CI-Konfiguration

### Tests

- Schreibe Tests für alle neuen Funktionen und Bugfixes
- Führe alle Tests lokal aus, bevor du einen PR einreichst
- Strebe eine hohe Testabdeckung an

## Dokumentation

- Halte die README.md aktuell
- Dokumentiere neue Funktionalitäten und CLI-Optionen
- Füge JSDoc-Kommentare für neue Funktionen und Methoden hinzu

## Veröffentlichungsprozess

Der Veröffentlichungsprozess wird vom Projektbetreuer verwaltet:

1. Versionsänderungen werden über entsprechende Git-Tags markiert
2. Eine automatische GitHub Action veröffentlicht neue Releases auf npm
3. Semantische Versionierung (MAJOR.MINOR.PATCH) wird strikt eingehalten

## Fragen?

Wenn du Fragen hast oder Hilfe benötigst, eröffne bitte ein Issue mit dem Label "question".

Danke für deine Beiträge!
