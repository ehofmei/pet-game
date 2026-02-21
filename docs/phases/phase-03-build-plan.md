# Phase 03 Build Plan: App Shell, Navigation, and Profiles

## Implementation Tasks

1. Add `ActiveProfileContext` (or equivalent state store):
	- Load default profile on startup.
	- Persist active profile id in local storage.
2. Build Profiles page:
	- Profile list with active marker.
	- Create form.
	- Rename action.
	- Delete action with hard confirmation dialog.
3. Add guards:
	- Prevent deleting the last remaining profile.
	- If active profile deleted, select another profile automatically.
4. Wire context into all tab pages:
	- Query data by `activeProfileId`.
	- Clear page state when profile changes.

## Verification

1. Create 3 profiles and switch among them.
2. Confirm active profile persists after refresh.
3. Delete non-active and active profiles and confirm fallback behavior.
4. Run TypeScript build with no errors.

## Definition of Done

1. Profiles management is complete and stable.
2. Active profile context works across all tabs.
3. Data isolation by profile is consistently applied.
