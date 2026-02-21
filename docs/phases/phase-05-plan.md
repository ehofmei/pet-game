# Phase 05 Plan: Store, Inventory, Wallet, Transactions

## Goal

Implement catalog browsing, purchases, inventory quantity management, and wallet adjustments with transaction logging.

## Scope

1. Store tab:
	- Catalog list
	- Filters by type/species restriction
	- Buy action with balance validation
2. Purchase behaviors:
	- `pet` store item purchase creates Pet record.
	- `supply` and `breedingSession` purchases increment InventoryItem quantity.
	- Wallet deducted by `pricePetCoins` and/or `priceCoins`.
3. Inventory tab:
	- Item list with quantity display
	- Filter by restriction/tags
	- Quick +/- quantity adjustments with confirmation
4. Wallet display and manual parent adjustments with reason.
5. TransactionLog entries for all money and admin adjustments.
6. Admin: add custom StoreItem (local-only) in Profiles/settings area.

## Non-Goals

1. Breeding execution (Phase 06).

## Dependencies

1. Prior phases completed.
2. Reliable active profile context.

## Deliverables

1. Fully working local economy loops.
2. Transaction audit trail for key actions.
3. Admin extensibility for new store items.

## Exit Criteria

1. Purchases fail gracefully on insufficient balance.
2. Purchases mutate wallet/inventory/pets correctly.
3. Manual wallet adjustments are logged with notes.
