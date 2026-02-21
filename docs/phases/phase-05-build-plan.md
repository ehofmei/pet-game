# Phase 05 Build Plan: Store, Inventory, Wallet, Transactions

## Implementation Tasks

1. Build Store page:
	- Fetch active `StoreItem` catalog where `isActive=true`.
	- Filter controls for type and species restriction.
	- Purchase button states and insufficient-funds message.
2. Implement purchase service:
	- Calculate total deltas (coins and petCoins).
	- Validate wallet balance before writing.
	- Perform multi-entity write transaction (wallet + inventory/pet + log).
3. Build Inventory page:
	- Group inventory entries with store item metadata.
	- Implement quick quantity +/- actions with confirmation.
	- Prevent negative quantities.
4. Add wallet module:
	- Prominent balances in Inventory page.
	- Parent adjustment form with reason note.
	- Write `TransactionLog` entry for adjustment.
5. Build Admin tools UI:
	- Dedicated Admin tab.
	- Store item add/edit/delete form.
	- Wallet adjustments and diagnostics visibility.
	- Optional photo upload (Photo table reference).
	- Persist with generated stable id and defaults.

## Verification

1. Buy each item type and verify expected data mutations.
2. Attempt purchases with low balance and confirm block.
3. Adjust inventory quantities and confirm no negative values.
4. Validate each purchase and adjustment creates log records.

## Definition of Done

1. Economy mechanics are functional and consistent.
2. Inventory quantities and wallet balances remain accurate.
3. Admin can add custom store items locally.

## Build Status

1. Completed.
2. Verification performed with lint, unit/integration tests, e2e tests, and production build.
