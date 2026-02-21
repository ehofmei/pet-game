# Phase 02 Build Plan: IndexedDB Data Layer and Seed Data

## Implementation Tasks

1. Create model types in `src/models/*`.
2. Implement Dexie database in `src/db/database.ts`:
	- Define all stores and key paths/indexes.
	- Include profileId and createdAt indexes where query-heavy.
3. Create repositories in `src/db/repos/*`:
	- Profile repo
	- Pets repo
	- Photos repo
	- Store repo
	- Inventory repo
	- Wallet repo
	- Transactions repo
	- Breeding repo
4. Add seed module in `src/db/seed.ts`:
	- Guard by existing profile/store checks.
	- Insert default profile + wallet.
	- Insert starter store catalog (>=12 items).
5. Add app startup bootstrap:
	- Initialize DB.
	- Run seed once on first load.

## Verification

1. Add a simple debug action or console check to list seeded store items.
2. Refresh app and confirm data remains.
3. Delete browser storage, reload, confirm clean reseed.
4. Validate no duplicate store items after multiple launches.

## Definition of Done

1. All data entities exist and are queryable.
2. Seed data aligns with requirements.
3. DB code is typed, modular, and ready for page integration.
