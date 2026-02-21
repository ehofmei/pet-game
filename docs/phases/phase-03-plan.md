# Phase 03 Plan: App Shell, Navigation, and Profiles

## Goal

Enable multiple local profiles with active-profile switching and profile-level isolation for pets, inventory, and wallet.

## Scope

1. Build Profiles tab workflows:
	- Create profile
	- Rename profile
	- Delete profile with confirmation
	- Switch active profile
2. Store active profile selection locally.
3. Ensure all page-level data queries use active profile context.
4. Add Profiles settings area for admin controls entry point.

## Non-Goals

1. Full store admin item creation can land in Phase 05.
2. Export/import can wait for Phase 07.

## Dependencies

1. Phase 02 DB and repository layer.

## Deliverables

1. Working multi-profile management UI.
2. Safe active profile switching across app.
3. Data scoped correctly by profileId.

## Exit Criteria

1. Can create at least three profiles.
2. Switching profiles changes visible pets/inventory/wallet context.
3. Deleting a profile is confirmed and handled safely.
