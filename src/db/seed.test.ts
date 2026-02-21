import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { ProfileRepo, WalletRepo } from './repos'
import { STARTER_STORE_ITEMS, seedDatabase } from './seed'
import { createTestDb, disposeTestDb } from './testDb'
import type { PetBreederCardsDb } from './database'

let db: PetBreederCardsDb | null = null

afterEach(async () => {
	if (db) {
		await disposeTestDb(db)
		db = null
	}
})

describe('seedDatabase', () => {
	it('creates default profile, wallet, and starter store catalog', async () => {
		db = await createTestDb()

		const result = await seedDatabase(db)

		const profiles = await new ProfileRepo(db).list()
		const wallet = await new WalletRepo(db).getByProfileId(profiles[0].id)
		const storeCount = await db.storeItems.count()

		expect(result.profileCreated).toBe(true)
		expect(result.storeItemsInserted).toBeGreaterThanOrEqual(12)
		expect(profiles).toHaveLength(1)
		expect(profiles[0].name).toBe('Family')
		expect(wallet).toBeDefined()
		expect(wallet?.coins).toBe(0)
		expect(wallet?.petCoins).toBe(0)
		expect(storeCount).toBe(STARTER_STORE_ITEMS.length)
	})

	it('is idempotent and does not duplicate seed records', async () => {
		db = await createTestDb()

		await seedDatabase(db)
		const secondRun = await seedDatabase(db)

		const profileCount = await db.profiles.count()
		const walletCount = await db.wallets.count()
		const storeCount = await db.storeItems.count()

		expect(secondRun.profileCreated).toBe(false)
		expect(secondRun.storeItemsInserted).toBe(0)
		expect(profileCount).toBe(1)
		expect(walletCount).toBe(1)
		expect(storeCount).toBe(STARTER_STORE_ITEMS.length)
	})
})
