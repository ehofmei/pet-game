import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
	BreedingRepo,
	InventoryRepo,
	PetRepo,
	PhotoRepo,
	ProfileRepo,
	StoreRepo,
	TransactionRepo,
	WalletRepo,
} from './repos'
import { createTestDb, disposeTestDb } from './testDb'
import type { PetBreederCardsDb } from './database'

let db: PetBreederCardsDb | null = null

afterEach(async () => {
	if (db) {
		await disposeTestDb(db)
		db = null
	}
})

describe('repository layer', () => {
	it('supports profile-scoped CRUD workflows', async () => {
		db = await createTestDb()
		const profileRepo = new ProfileRepo(db)
		const walletRepo = new WalletRepo(db)
		const storeRepo = new StoreRepo(db)
		const inventoryRepo = new InventoryRepo(db)
		const photoRepo = new PhotoRepo(db)
		const petRepo = new PetRepo(db)
		const transactionRepo = new TransactionRepo(db)
		const breedingRepo = new BreedingRepo(db)

		const profile = await profileRepo.create({ name: 'Tester' })
		await walletRepo.ensureForProfile({ profileId: profile.id, coins: 10, petCoins: 5 })
		await profileRepo.rename(profile.id, 'Tester Renamed')

		const updatedProfile = await profileRepo.getById(profile.id)
		expect(updatedProfile?.name).toBe('Tester Renamed')

		const storeItemId = 'test-supply'
		await storeRepo.put({
			id: storeItemId,
			type: 'supply',
			name: 'Test Supply',
			description: 'Repo smoke item',
			speciesRestriction: null,
			pricePetCoins: 0,
			priceCoins: 2,
			photoId: null,
			tags: ['test'],
			isActive: true,
		})

		const activeStoreItems = await storeRepo.listActive()
		expect(activeStoreItems.some((item) => item.id === storeItemId)).toBe(true)

		const inventoryItem = await inventoryRepo.upsertQuantity({
			profileId: profile.id,
			itemId: storeItemId,
			quantityDelta: 3,
		})
		expect(inventoryItem.quantity).toBe(3)

		const photo = await photoRepo.create({
			blob: new Blob(['test photo'], { type: 'image/png' }),
			mimeType: 'image/png',
		})
		expect(photo.id).toBeTruthy()

		const petA = await petRepo.create({
			profileId: profile.id,
			name: 'Pet A',
			species: 'cat',
			gender: 'female',
			wasWild: false,
			tags: ['friendly'],
			photoId: photo.id,
		})

		const petB = await petRepo.create({
			profileId: profile.id,
			name: 'Pet B',
			species: 'cat',
			gender: 'male',
			wasWild: true,
			tags: ['wild'],
		})

		await transactionRepo.create({
			profileId: profile.id,
			kind: 'adjustment',
			deltaPetCoins: 5,
			deltaCoins: -2,
			notes: 'Test adjustment',
		})

		const baby = await petRepo.create({
			profileId: profile.id,
			name: 'Baby',
			species: 'cat',
			gender: 'unknown',
			wasWild: false,
			tags: ['baby'],
			breedCount: 0,
		})

		await breedingRepo.create({
			profileId: profile.id,
			parentAId: petA.id,
			parentBId: petB.id,
			babyPetId: baby.id,
			usedBreedingSessionItem: true,
		})

		const pets = await petRepo.listByProfile(profile.id)
		const logs = await transactionRepo.listByProfile(profile.id)
		const eventsForPetA = await breedingRepo.listByPetId(petA.id)
		const wallet = await walletRepo.adjust({
			profileId: profile.id,
			deltaPetCoins: 2,
			deltaCoins: -1,
		})

		expect(pets).toHaveLength(3)
		expect(logs).toHaveLength(1)
		expect(eventsForPetA).toHaveLength(1)
		expect(wallet.petCoins).toBe(7)
		expect(wallet.coins).toBe(9)
	})
})
