import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import type { Pet } from '../../models'
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
	tags,
}: {
	database: PetBreederCardsDb
	profileId: string
	id: string
	name: string
	species: Pet['species']
	tags: string[]
}): Promise<Pet> => {
	const timestamp = new Date().toISOString()
	const pet: Pet = {
		id,
		profileId,
		name,
		species,
		gender: 'female',
		wasWild: false,
		tags,
		breedCount: 0,
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
	it('uses a breeding token from inventory and creates a baby pet', async () => {
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
			tags: ['striped'],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-b',
			name: 'Milo',
			species: 'cat',
			tags: ['playful'],
		})
		await db.inventoryItems.add({
			id: 'inv-token',
			profileId,
			itemId: 'breeding-session-basic',
			quantity: 1,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-a',
			parentBId: 'parent-b',
			allowCrossSpecies: true,
			autoBuySessionIfNeeded: false,
		})

		expect(result.usedBreedingSessionItem).toBe(true)
		expect(result.purchasedBreedingSession).toBe(false)
		expect(result.babyPet.species).toBe('cat')
		expect(result.babyPet.name).toContain('Baby of Luna + Milo')
		expect(result.babyPet.tags).toEqual(expect.arrayContaining(['striped', 'playful', 'baby']))

		const updatedParentA = await db.pets.get('parent-a')
		const updatedParentB = await db.pets.get('parent-b')
		expect(updatedParentA?.breedCount).toBe(1)
		expect(updatedParentB?.breedCount).toBe(1)

		const inventoryToken = await db.inventoryItems.where('[profileId+itemId]').equals([profileId, 'breeding-session-basic']).first()
		expect(inventoryToken?.quantity).toBe(0)

		const logs = await db.transactionLogs.where('profileId').equals(profileId).toArray()
		const breedingLog = logs.find((log) => log.kind === 'breeding')
		expect(breedingLog?.deltaCoins).toBe(0)
		expect(breedingLog?.deltaPetCoins).toBe(0)
	})

	it('buys and uses a breeding session when no inventory token exists', async () => {
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
			tags: ['swift'],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-d',
			name: 'Rex',
			species: 'dog',
			tags: ['brave'],
		})

		const result = await service.runBreeding({
			profileId,
			parentAId: 'parent-c',
			parentBId: 'parent-d',
			allowCrossSpecies: true,
			autoBuySessionIfNeeded: true,
		})

		expect(result.usedBreedingSessionItem).toBe(false)
		expect(result.purchasedBreedingSession).toBe(true)
		expect(result.babyPet.species).toBe('mixed')
		expect(result.wallet.coins).toBe(15)

		const logs = await db.transactionLogs.where('profileId').equals(profileId).toArray()
		const breedingLog = logs.find((log) => log.kind === 'breeding')
		expect(breedingLog?.deltaCoins).toBe(-10)
		expect(breedingLog?.deltaPetCoins).toBe(0)
	})

	it('requires token purchase confirmation when no breeding token exists', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-e',
			name: 'Ivy',
			species: 'cat',
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-f',
			name: 'Pip',
			species: 'cat',
			tags: [],
		})

		await expect(
			service.runBreeding({
				profileId,
				parentAId: 'parent-e',
				parentBId: 'parent-f',
				allowCrossSpecies: true,
				autoBuySessionIfNeeded: false,
			}),
		).rejects.toMatchObject({ code: 'BREEDING_SESSION_REQUIRED' })
	})

	it('blocks cross-species breeding when disabled', async () => {
		db = await createTestDb()
		await seedDatabase(db)
		const service = new BreedingService(db)
		const profileId = await getFirstProfileId(db)

		await createParentPet({
			database: db,
			profileId,
			id: 'parent-g',
			name: 'Nora',
			species: 'cat',
			tags: [],
		})
		await createParentPet({
			database: db,
			profileId,
			id: 'parent-h',
			name: 'Bolt',
			species: 'dog',
			tags: [],
		})

		await expect(
			service.runBreeding({
				profileId,
				parentAId: 'parent-g',
				parentBId: 'parent-h',
				allowCrossSpecies: false,
				autoBuySessionIfNeeded: true,
			}),
		).rejects.toMatchObject({ code: 'INVALID_INPUT' })
	})
})
