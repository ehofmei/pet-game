import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import type { PetBreederCardsDb } from '../database'
import { seedDatabase } from '../seed'
import { createTestDb, disposeTestDb } from '../testDb'
import { EconomyService } from './economyService'

let db: PetBreederCardsDb | null = null

const getFirstProfileId = async (database: PetBreederCardsDb): Promise<string> => {
	const profile = await database.profiles.toCollection().first()
	if (!profile) {
		throw new Error('Expected seeded profile to exist.')
	}
	return profile.id
}

afterEach(async () => {
	if (db) {
		await disposeTestDb(db)
		db = null
	}
})

describe('EconomyService', () => {
	it('purchases pet store items and deducts wallet balances', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)
		const profileId = await getFirstProfileId(db)

		await db.wallets.put({
			profileId,
			petCoins: 30,
			coins: 5,
			updatedAt: new Date().toISOString(),
		})

		await db.photos.add({
			id: 'photo-pet-card-cat',
			blob: new Blob(['pet-photo'], { type: 'image/png' }),
			mimeType: 'image/png',
			createdAt: new Date().toISOString(),
		})
		await db.storeItems.update('pet-card-cat', {
			photoId: 'photo-pet-card-cat',
		})

		const result = await service.purchaseStoreItem({
			profileId,
			storeItemId: 'pet-card-cat',
		})
		expect(result.createdPetId).toBeTruthy()

		const wallet = await db.wallets.get(profileId)
		expect(wallet?.petCoins).toBe(5)
		expect(wallet?.coins).toBe(5)

		const pet = await db.pets.get(result.createdPetId ?? '')
		expect(pet?.name).toBe('Cat Pet Card')
		expect(pet?.species).toBe('cat')
		expect(pet?.photoId).toBe('photo-pet-card-cat')

		const logs = await db.transactionLogs.where('profileId').equals(profileId).toArray()
		expect(logs.some((log) => log.kind === 'buyPet')).toBe(true)
	})

	it('purchases supply items and increments inventory quantity', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)
		const profileId = await getFirstProfileId(db)

		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 15,
			updatedAt: new Date().toISOString(),
		})

		await service.purchaseStoreItem({
			profileId,
			storeItemId: 'toy-generic',
		})
		await service.purchaseStoreItem({
			profileId,
			storeItemId: 'toy-generic',
		})

		const inventory = await db.inventoryItems.where('[profileId+itemId]').equals([profileId, 'toy-generic']).first()
		expect(inventory?.quantity).toBe(2)

		const wallet = await db.wallets.get(profileId)
		expect(wallet?.coins).toBe(5)
	})

	it('blocks purchases on insufficient funds', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)
		const profileId = await getFirstProfileId(db)

		await expect(
			service.purchaseStoreItem({
				profileId,
				storeItemId: 'toy-generic',
			}),
		).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' })
	})

	it('adjusts inventory with floor at zero and logs each adjustment', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)
		const profileId = await getFirstProfileId(db)

		await service.adjustInventory({
			profileId,
			itemId: 'toy-generic',
			quantityDelta: 2,
			notes: 'Setup quantity',
		})
		await service.adjustInventory({
			profileId,
			itemId: 'toy-generic',
			quantityDelta: -5,
			notes: 'Consume quantity',
		})

		const inventory = await db.inventoryItems.where('[profileId+itemId]').equals([profileId, 'toy-generic']).first()
		expect(inventory?.quantity).toBe(0)

		const adjustmentLogs = await db.transactionLogs
			.where('profileId')
			.equals(profileId)
			.toArray()
		expect(adjustmentLogs.filter((log) => log.kind === 'adjustment')).toHaveLength(2)
	})

	it('adds custom store items with generated stable ids', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)

		const item = await service.addCustomStoreItem({
			type: 'supply',
			name: 'Hamster Wheel',
			description: 'Wheel for energy play.',
			speciesRestriction: null,
			pricePetCoins: 0,
			priceCoins: 7,
			photoId: null,
			tags: ['toy', 'hamster'],
			isActive: true,
		})

		expect(item.id.startsWith('custom-hamster-wheel-')).toBe(true)
		const stored = await db.storeItems.get(item.id)
		expect(stored?.name).toBe('Hamster Wheel')
		expect(stored?.pricePetCoins).toBe(0)
		expect(stored?.priceCoins).toBe(7)
	})

	it('normalizes pet custom item prices to PetCoins-only', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new EconomyService(db)

		const item = await service.addCustomStoreItem({
			type: 'pet',
			name: 'Custom Pet Card',
			description: 'Pet item test',
			speciesRestriction: 'cat',
			pricePetCoins: 22,
			priceCoins: 99,
			photoId: null,
			tags: ['pet'],
			isActive: true,
		})

		expect(item.pricePetCoins).toBe(22)
		expect(item.priceCoins).toBe(0)
	})
})
