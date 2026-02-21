# Phase 07 Build Plan: Export/Import, QA, Release Readiness

## Implementation Tasks

1. Implement export utility:
	- Read all Dexie tables.
	- Serialize records into JSON package format with schema version.
	- Download as timestamped `.json` file.
2. Implement import utility:
	- Parse selected file.
	- Validate required keys/schema version.
	- Show overwrite warning and require confirmation.
	- Clear existing DB and restore all entities in proper order.
3. Handle photo blob import/export:
	- Preserve Blob data and mime types.
	- Validate restored photos resolve via `photoId`.
4. Run acceptance checklist test pass:
	- Profiles
	- Pets/photo capture persistence
	- Store/inventory/wallet behavior
	- Breeding flow + logs
	- Export/import restore
	- PWA install/offline
5. Write final docs:
	- `README.md` setup and scripts.
	- Optional `DEPLOY.md` for GitHub Pages and iPad Add to Home Screen steps.

## Verification

1. Create realistic sample dataset, export, wipe DB, import, re-verify all pages.
2. Confirm build works and deployed bundle runs without network.
3. Confirm no console errors in major flows.

## Definition of Done

1. Backup/restore is safe and reliable.
2. Acceptance checklist is fully green.
3. Project is ready for iterative enhancements.
