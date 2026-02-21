# Phase 07 Plan: Export/Import, QA, Release Readiness

## Goal

Complete backup/restore, run acceptance validation, and finalize deployment/install instructions.

## Scope

1. Export Data:
	- Create JSON backup containing all DB entities including photo blobs.
2. Import Data:
	- Select JSON file.
	- Validate structure.
	- Warn and replace local data on confirmation.
3. PWA/offline polish:
	- Verify install prompts and offline behavior.
	- Improve loading/error states.
4. QA pass against acceptance checklist.
5. Document local dev and free-host deployment path (GitHub Pages).

## Non-Goals

1. Cloud sync/multi-device sync.
2. Authentication/user accounts.

## Dependencies

1. All feature phases complete.

## Deliverables

1. Reliable backup/restore flow.
2. Final runbook docs and deployment instructions.
3. Acceptance checklist report with pass/fail status.

## Exit Criteria

1. Exported data restores a full app state including photos.
2. All acceptance checklist items pass.
3. Build artifact is deployable and installable as PWA.
