# Data Model Reference

This document describes the current implemented data model in IndexedDB/Dexie.

## Source Of Truth

1. Schema: `src/db/database.ts`
2. Domain types: `src/models/*`
3. Seed/default data: `src/db/seed.ts`
4. Data-access behavior: `src/db/repos/*`

## Database

1. Dexie database name default: `petBreederCardsDb`
2. Current schema version: `1`

## Tables And Fields

### `profiles`

1. Primary key: `id`
2. Indexed fields: `name`, `createdAt`, `updatedAt`
3. Fields:
	- `id: string`
	- `name: string`
	- `createdAt: string` (ISO datetime)
	- `updatedAt: string` (ISO datetime)

### `pets`

1. Primary key: `id`
2. Indexed fields: `profileId`, `species`, `gender`, `wasWild`, `createdAt`, `updatedAt`
3. Fields:
	- `id: string`
	- `profileId: string` (FK-like reference to `profiles.id`)
	- `name: string`
	- `species: 'cat' | 'dog' | 'bird' | 'bunny' | 'other' | 'mixed'`
	- `gender: 'male' | 'female' | 'unknown'`
	- `wasWild: boolean`
	- `tags: string[]`
	- `breedCount: number`
	- `photoId: string | null` (FK-like reference to `photos.id`)
	- `notes?: string`
	- `createdAt: string` (ISO datetime)
	- `updatedAt: string` (ISO datetime)

### `photos`

1. Primary key: `id`
2. Indexed fields: `createdAt`
3. Fields:
	- `id: string`
	- `blob: Blob`
	- `mimeType: string`
	- `createdAt: string` (ISO datetime)

### `inventoryItems`

1. Primary key: `id`
2. Indexed fields: `profileId`, `itemId`, `[profileId+itemId]`, `createdAt`, `updatedAt`
3. Fields:
	- `id: string`
	- `profileId: string` (FK-like reference to `profiles.id`)
	- `itemId: string` (FK-like reference to `storeItems.id`)
	- `quantity: number`
	- `createdAt: string` (ISO datetime)
	- `updatedAt: string` (ISO datetime)

### `storeItems`

1. Primary key: `id`
2. Indexed fields: `type`, `speciesRestriction`, `isActive`, `createdAt`, `updatedAt`
3. Fields:
	- `id: string` (stable catalog id)
	- `type: 'pet' | 'supply' | 'breedingSession'`
	- `name: string`
	- `description: string`
	- `speciesRestriction: 'cat' | 'dog' | 'bird' | 'bunny' | 'other' | 'mixed' | null`
	- `pricePetCoins: number`
	- `priceCoins: number`
	- `photoId: string | null` (optional FK-like reference to `photos.id`)
	- `tags: string[]`
	- `isActive: boolean`
	- `createdAt: string` (ISO datetime)
	- `updatedAt: string` (ISO datetime)

### `wallets`

1. Primary key: `profileId`
2. Indexed fields: `updatedAt`
3. Fields:
	- `profileId: string` (matches `profiles.id`)
	- `petCoins: number`
	- `coins: number`
	- `updatedAt: string` (ISO datetime)

### `transactionLogs`

1. Primary key: `id`
2. Indexed fields: `profileId`, `kind`, `createdAt`
3. Fields:
	- `id: string`
	- `profileId: string` (FK-like reference to `profiles.id`)
	- `kind: 'buyPet' | 'buyItem' | 'breeding' | 'adjustment'`
	- `deltaPetCoins: number`
	- `deltaCoins: number`
	- `notes: string`
	- `createdAt: string` (ISO datetime)

### `breedingEvents`

1. Primary key: `id`
2. Indexed fields: `profileId`, `parentAId`, `parentBId`, `babyPetId`, `createdAt`
3. Fields:
	- `id: string`
	- `profileId: string` (FK-like reference to `profiles.id`)
	- `parentAId: string` (FK-like reference to `pets.id`)
	- `parentBId: string` (FK-like reference to `pets.id`)
	- `babyPetId: string` (FK-like reference to `pets.id`)
	- `usedBreedingSessionItem: boolean`
	- `createdAt: string` (ISO datetime)

## Relationships (Logical)

1. One `Profile` -> many `Pet`, `InventoryItem`, `TransactionLog`, `BreedingEvent`.
2. One `Profile` -> one `Wallet` (keyed by `profileId`).
3. One `Photo` can be referenced by many records (`Pet`, optional `StoreItem`).
4. One `StoreItem` can be referenced by many `InventoryItem` rows.

Note: Foreign keys are enforced in application logic, not by IndexedDB itself.

## Seed Defaults

On first run (`seedDatabase`):

1. Creates default profile: `Family`.
2. Creates matching wallet with:
	- `petCoins = 0`
	- `coins = 0`
3. Inserts starter `StoreItem` catalog (15 records currently).
4. Seed is idempotent (no duplicate inserts on repeated runs).

## Repository Behavior Notes

1. `ProfileRepo.create` and `rename` trim name strings.
2. `PetRepo.create` trims name and applies defaults:
	- `tags = []`
	- `breedCount = 0`
	- `photoId = null`
3. `InventoryRepo.upsertQuantity` clamps quantity to minimum `0`.
4. `WalletRepo.ensureForProfile` auto-creates missing wallet with `0/0` unless values are provided.
5. `WalletRepo.adjust` does not clamp negatives by default.
6. `StoreRepo.listActive` filters `isActive === true`.

## Profile Deletion Behavior

Active profile context deletes associated profile-scoped records in a transaction:

1. `pets` where `profileId`
2. `inventoryItems` where `profileId`
3. `transactionLogs` where `profileId`
4. `breedingEvents` where `profileId`
5. `wallets` row by `profileId`
6. `profiles` row

Note: orphaned `photos` are currently possible after deletions unless explicitly cleaned elsewhere.

## Timestamp Convention

1. Datetime fields are stored as ISO strings (`new Date().toISOString()`).

## Model/Schema Drift Rule

When changing any model field:

1. Update `src/models/*`
2. Update `src/db/database.ts` indexes/stores
3. Add/adjust Dexie migration (next version)
4. Update repository methods
5. Update this document
