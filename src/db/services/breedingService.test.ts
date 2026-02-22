import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import type { Pet } from '../../models'
import { EXTRA_BREED_CARD_ITEM_ID } from '../constants'
import type { PetBreederCardsDb } from '../database'
import { seedDatabase } from '../seed'
import { createTestDb, disposeTestDb } from '../testDb'
import { BreedingService } from './breedingService'

let db: PetBreederCardsDb | null = null

const getFirstProfileId = async (database: PetBreederCardsDb): Promise<string> => {
	const profile = await database.profiles.toCollection().first()
	if (!profile) {
		throw new Error('Expected seeded profile to exist.')
	}
	return profile.id
}

const createParentPet = async ({
	database,
	profileId,
	id,
	name,
	species,
	gender,
	breedCount,
	tags,
}: {
	database: PetBreederCardsDb
	profileId: string
	id: string
	name: string
	species: Pet['species']
	gender?: Pet['gender']
	breedCount?: number
	tags: string[]
}): Promise<Pet> => {
	const timestamp = new Date().toISOString()
	const pet: Pet = {
		id,
		profileId,
		name,
		species,
		gender: gender ?? 'female',
		wasWild: false,
		tags,
		breedCount: breedCount ?? 0,
		photoId: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	}
	await database.pets.add(pet)
	return pet
}

afterEach(async () => {
	if (db) {
		await disposeTestDb(db)
		db = null
	}
})

describe('BreedingService', () => {
	it('creates multiple babies, charges coins per child, and applies special breed costs', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-a',
			name: 'Luna',
			species: 'cat',
			gender: 'female',
			tags: ['striped'],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-b',
			name: 'Milo',
			species: 'cat',
			gender: 'male',
			tags: ['playful'],
		})
		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 50,
			updatedAt: new Date().toISOString(),
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-a',
			parentBId: 'parent-b',
			allowCrossSpecies: true,
			childCount: 3,
			specialBreedRequested: true,
			themeTags: ['hearts'],
			useExtraBreedCard: false,
		})

		expect(result.babyPets).toHaveLength(3)
		expect(result.babyPets[0]?.species).toBe('cat')
		expect(result.babyPets[0]?.tags).toEqual(expect.arrayContaining(['striped', 'playful', 'baby', 'hearts']))
		expect(result.specialBreedApplied).toBe(true)
		expect(result.totalCoinsCost).toBe(35)
		expect(result.wallet.coins).toBe(15)

		const updatedParentA = await db.pets.get('parent-a')
		const updatedParentB = await db.pets.get('parent-b')
		expect(updatedParentA?.breedCount).toBe(1)
		expect(updatedParentB?.breedCount).toBe(1)

		const events = await db.breedingEvents.where('profileId').equals(profileId).toArray()
		expect(events).toHaveLength(3)

		const logs = await db.transactionLogs.where('profileId').equals(profileId).toArray()
		const breedingLog = logs.find((log) => log.kind === 'breeding')
		expect(breedingLog?.deltaCoins).toBe(-35)
		expect(breedingLog?.deltaPetCoins).toBe(0)
	})

	it('forces special breed cost for same-gender pairs', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 25,
			updatedAt: new Date().toISOString(),
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-c',
			name: 'Skye',
			species: 'cat',
			gender: 'female',
			tags: ['swift'],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-d',
			name: 'Ivy',
			species: 'cat',
			gender: 'female',
			tags: ['quiet'],
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-c',
			parentBId: 'parent-d',
			allowCrossSpecies: true,
			childCount: 1,
			specialBreedRequested: false,
			themeTags: [],
			useExtraBreedCard: false,
		})

		expect(result.specialBreedApplied).toBe(true)
		expect(result.totalCoinsCost).toBe(15)
		expect(result.wallet.coins).toBe(10)
	})

	it('creates mixed species babies and standard cost when special is not used', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 25,
			updatedAt: new Date().toISOString(),
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-e',
			name: 'Skye',
			species: 'cat',
			gender: 'female',
			tags: ['swift'],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-f',
			name: 'Rex',
			species: 'dog',
			gender: 'male',
			tags: ['brave'],
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-e',
			parentBId: 'parent-f',
			allowCrossSpecies: true,
			childCount: 2,
			specialBreedRequested: false,
			themeTags: [],
			useExtraBreedCard: false,
		})

		expect(result.babyPets).toHaveLength(2)
		expect(result.babyPets[0]?.species).toBe('mixed')
		expect(result.specialBreedApplied).toBe(false)
		expect(result.totalCoinsCost).toBe(20)
		expect(result.wallet.coins).toBe(5)

		const logs = await db.transactionLogs.where('profileId').equals(profileId).toArray()
		const breedingLog = logs.find((log) => log.kind === 'breeding')
		expect(breedingLog?.deltaCoins).toBe(-20)
		expect(breedingLog?.deltaPetCoins).toBe(0)
	})

	it('blocks breeding when coins are insufficient', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-g',
			name: 'Ivy',
			species: 'cat',
			gender: 'female',
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-h',
			name: 'Pip',
			species: 'cat',
			gender: 'male',
			tags: [],
		})
		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 5,
			updatedAt: new Date().toISOString(),
		})

		await expect(
			service.runBreeding({
				profileId,
				parentAId: 'parent-g',
				parentBId: 'parent-h',
				allowCrossSpecies: true,
				childCount: 1,
				specialBreedRequested: false,
				themeTags: [],
				useExtraBreedCard: false,
			}),
		).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' })
	})

	it('blocks cross-species breeding when disabled', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-i',
			name: 'Nora',
			species: 'cat',
			gender: 'female',
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-j',
			name: 'Bolt',
			species: 'dog',
			gender: 'male',
			tags: [],
		})
		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 50,
			updatedAt: new Date().toISOString(),
		})

		await expect(
			service.runBreeding({
				profileId,
				parentAId: 'parent-i',
				parentBId: 'parent-j',
				allowCrossSpecies: false,
				childCount: 1,
				specialBreedRequested: false,
				themeTags: [],
				useExtraBreedCard: false,
			}),
		).rejects.toMatchObject({ code: 'INVALID_INPUT' })
	})

	it('requires and consumes an Extra Breed Card when a parent is at 5+ breeds', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-k',
			name: 'Nova',
			species: 'cat',
			gender: 'female',
			breedCount: 5,
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-l',
			name: 'Ash',
			species: 'cat',
			gender: 'male',
			breedCount: 2,
			tags: [],
		})
		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 50,
			updatedAt: new Date().toISOString(),
		})
		await db.inventoryItems.add({
			id: 'inventory-extra-card',
			profileId,
			itemId: EXTRA_BREED_CARD_ITEM_ID,
			quantity: 1,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-k',
			parentBId: 'parent-l',
			allowCrossSpecies: true,
			childCount: 1,
			specialBreedRequested: false,
			themeTags: [],
			useExtraBreedCard: true,
		})

		expect(result.extraBreedCardRequired).toBe(true)
		expect(result.extraBreedCardUsed).toBe(true)
		const remainingCard = await db.inventoryItems
			.where('[profileId+itemId]')
			.equals([profileId, EXTRA_BREED_CARD_ITEM_ID])
			.first()
		expect(remainingCard?.quantity).toBe(0)
	})

	it('blocks breeding when Extra Breed Card is required but not confirmed', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-m',
			name: 'River',
			species: 'cat',
			gender: 'female',
			breedCount: 6,
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-n',
			name: 'Oak',
			species: 'cat',
			gender: 'male',
			tags: [],
		})
		await db.wallets.put({
			profileId,
			petCoins: 0,
			coins: 50,
			updatedAt: new Date().toISOString(),
		})

		await expect(
			service.runBreeding({
				profileId,
				parentAId: 'parent-m',
				parentBId: 'parent-n',
				allowCrossSpecies: true,
				childCount: 1,
				specialBreedRequested: false,
				themeTags: [],
				useExtraBreedCard: false,
			}),
		).rejects.toMatchObject({ code: 'INVALID_INPUT' })
	})
})
