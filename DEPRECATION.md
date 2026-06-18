# Deprecation Runbook

This repository and npm package are deprecated in favor of:

- https://github.com/mariokreitz/verbatra
- npm: https://www.npmjs.com/package/@verbatra/cli
- Documentation: https://www.verbatra.kreitz-webdev.de/

## Status and policy

- `i18n-excel-manager` is no longer maintained.
- npm package name `i18n-excel-manager` should remain permanently deprecated.
- Keep this repo read-only for 2-4 weeks to support migration.
- Archive the repository after the transition window.

## Maintainer checklist

1. Publish a final migration release (documentation + CLI warning).
2. Deprecate all npm versions with a migration message.
3. Pin migration notice in GitHub (issue + release note).
4. Switch repository settings to read-only mode.
5. After 2-4 weeks, archive repository.

## npm deprecation commands

Run from a maintainer machine authenticated to npm for this package.

```bash
npm whoami
npm deprecate i18n-excel-manager@"*" "Deprecated: This package is no longer maintained. Please migrate to @verbatra/cli: https://github.com/mariokreitz/verbatra"
npm view i18n-excel-manager deprecated
```

## Suggested migration notice text

```text
Deprecated: i18n-excel-manager is no longer maintained. Please migrate to @verbatra/cli:
https://github.com/mariokreitz/verbatra
```

## GitHub transition tasks

- Edit repo description to include "Deprecated: use @verbatra/cli".
- Pin a final issue with migration instructions and command mapping.
- Create a final GitHub release that links to `verbatra`.
- Disable publish workflow after final release.
- Lock branch protection to maintainers only (no new feature PR flow).
- Keep issues open only for migration support during the 2-4 week window.

## Post-window archive

After 2-4 weeks:

1. Close remaining open issues/PRs with migration link.
2. Disable issues and discussions (optional, based on preference).
3. Archive repository in GitHub settings.
