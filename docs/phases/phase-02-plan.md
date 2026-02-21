# Phase 02 Plan: IndexedDB Data Layer and Seed Data

## Goal

Implement the complete local data model in IndexedDB (Dexie) with initial profile, wallet, and store catalog seed data.

## Scope

1. Define TypeScript models for:
	- Profile
	- Pet
	- Photo
	- InventoryItem
	- StoreItem
	- Wallet
	- TransactionLog
	- BreedingEvent
2. Implement Dexie schema and migrations/versioning.
3. Build repository/service layer for CRUD operations.
4. Add deterministic first-run seeding:
	- Default profile: `Family`
	- Default wallet balances: `petCoins=0`, `coins=0`
	- Starter store catalog with at least 12 items.

## Non-Goals

1. No full UI workflows yet.
2. No export/import yet.

## Dependencies

1. Phase 01 project scaffold.
2. `uuid` library.
3. Dexie or equivalent IndexedDB wrapper.

## Deliverables

1. Functional local DB with all required tables.
2. Seed process that runs once safely.
3. Typed data access layer used by future pages.

## Exit Criteria

1. Reloading app preserves seeded and created records.
2. Reopening app does not duplicate seed data.
3. CRUD smoke tests pass for each entity through repository calls.
