import type { StoreItem } from '../models'
import { EXTRA_BREED_CARD_ITEM_ID } from './constants'
import { ProfileRepo, StoreRepo, WalletRepo } from './repos'
import type { PetBreederCardsDb } from './database'

export const DEFAULT_PROFILE_NAME = 'Family'

type SeedStoreItem = Omit<StoreItem, 'createdAt' | 'updatedAt'>

export const STARTER_STORE_ITEMS: ReadonlyArray<SeedStoreItem> = [
	{
		id: 'breeding-session-basic',
		type: 'breedingSession',
		name: 'Breeding Card',
		description: 'Used in breeding. Each child costs 10 Coins.',
		speciesRestriction: null,
		pricePetCoins: 0,
		priceCoins: 10,
		photoId: null,
		tags: ['breedingSession'],
		isActive: true,
	},
	{
		id: EXTRA_BREED_CARD_ITEM_ID,
		type: 'breedingSession',
		name: 'Extra Breed Card',
		description: 'Required when breeding with a pet that already has 5 or more breeds.',
		speciesRestriction: null,
		pricePetCoins: 0,
		priceCoins: 15,
		photoId: null,
		tags: ['breedingSession', 'extraBreedCard'],
		isActive: true,
	},
	{
		id: 'pet-card-cat',
		type: 'pet',
		name: 'Cat Pet Card',
		description: 'Adopt a cat card into your collection.',
		speciesRestriction: 'cat',
		pricePetCoins: 25,
		priceCoins: 0,
		photoId: null,
		tags: ['pet', 'cat'],
		isActive: true,
	},
	{
		id: 'pet-card-dog',
		type: 'pet',
		name: 'Dog Pet Card',
		description: 'Adopt a dog card into your collection.',
		speciesRestriction: 'dog',
		pricePetCoins: 25,
		priceCoins: 0,
		photoId: null,
		tags: ['pet', 'dog'],
		isActive: true,
	},
	{
		id: 'pet-card-bird',
		type: 'pet',
		name: 'Bird Pet Card',
		description: 'Adopt a bird card into your collection.',
		speciesRestriction: 'bird',
		pricePetCoins: 20,
		priceCoins: 0,
		photoId: null,
		tags: ['pet', 'bird'],
		isActive: true,
	},
	{
		id: 'toy-generic',
		type: 'supply',
		name: 'Toy (Any Species)',
		description: 'A fun toy for all pets.',
		speciesRestriction: null,
		pricePetCoins: 0,
		priceCoins: 5,
		photoId: null,
		tags: ['toy'],
		isActive: true,
	},
	{
		id: 'toy-cat',
		type: 'supply',
		name: 'Cat Toy',
		description: 'A toy made for cats.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 6,
		photoId: null,
		tags: ['toy', 'cat'],
		isActive: true,
	},
	{
		id: 'toy-dog',
		type: 'supply',
		name: 'Dog Toy',
		description: 'A toy made for dogs.',
		speciesRestriction: 'dog',
		pricePetCoins: 0,
		priceCoins: 6,
		photoId: null,
		tags: ['toy', 'dog'],
		isActive: true,
	},
	{
		id: 'toy-bird',
		type: 'supply',
		name: 'Bird Toy',
		description: 'A toy made for birds.',
		speciesRestriction: 'bird',
		pricePetCoins: 0,
		priceCoins: 6,
		photoId: null,
		tags: ['toy', 'bird'],
		isActive: true,
	},
	{
		id: 'dish-food-cat',
		type: 'supply',
		name: 'Cat Food Dish',
		description: 'Food dish for cats.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 4,
		photoId: null,
		tags: ['foodDish', 'cat'],
		isActive: true,
	},
	{
		id: 'dish-water-cat',
		type: 'supply',
		name: 'Cat Water Dish',
		description: 'Water dish for cats.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 4,
		photoId: null,
		tags: ['waterDish', 'cat'],
		isActive: true,
	},
	{
		id: 'dish-food-dog',
		type: 'supply',
		name: 'Dog Food Dish',
		description: 'Food dish for dogs.',
		speciesRestriction: 'dog',
		pricePetCoins: 0,
		priceCoins: 4,
		photoId: null,
		tags: ['foodDish', 'dog'],
		isActive: true,
	},
	{
		id: 'dish-water-dog',
		type: 'supply',
		name: 'Dog Water Dish',
		description: 'Water dish for dogs.',
		speciesRestriction: 'dog',
		pricePetCoins: 0,
		priceCoins: 4,
		photoId: null,
		tags: ['waterDish', 'dog'],
		isActive: true,
	},
	{
		id: 'cat-litter-box',
		type: 'supply',
		name: 'Cat Litter Box',
		description: 'Litter box for cat pets.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 8,
		photoId: null,
		tags: ['litterBox', 'cat'],
		isActive: true,
	},
	{
		id: 'cat-litter-scooper',
		type: 'supply',
		name: 'Cat Scooper',
		description: 'Scooper for cleaning the litter box.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 3,
		photoId: null,
		tags: ['scooper', 'cat'],
		isActive: true,
	},
	{
		id: 'cat-litter-bag',
		type: 'supply',
		name: 'Cat Litter',
		description: 'Bag of litter for cat habitats.',
		speciesRestriction: 'cat',
		pricePetCoins: 0,
		priceCoins: 5,
		photoId: null,
		tags: ['litter', 'cat'],
		isActive: true,
	},
]

export type SeedResult = {
	profileCreated: boolean
	storeItemsInserted: number
}

export const seedDatabase = async (db: PetBreederCardsDb): Promise<SeedResult> => {
	const profileRepo = new ProfileRepo(db)
	const walletRepo = new WalletRepo(db)
	const storeRepo = new StoreRepo(db)
	let profileCreated = false
	let storeItemsInserted = 0

	if ((await profileRepo.count()) === 0) {
		const profile = await profileRepo.create({ name: DEFAULT_PROFILE_NAME })
		await walletRepo.ensureForProfile({
			profileId: profile.id,
			petCoins: 0,
			coins: 0,
		})
		profileCreated = true
	}

	for (const item of STARTER_STORE_ITEMS) {
		const existing = await storeRepo.getById(item.id)
		if (!existing) {
			await storeRepo.put(item)
			storeItemsInserted += 1
			continue
		}

		if (
			(item.id === 'breeding-session-basic' || item.id === EXTRA_BREED_CARD_ITEM_ID) &&
			(existing.name !== item.name || existing.description !== item.description)
		) {
			await storeRepo.put(item)
		}
	}

	return {
		profileCreated,
		storeItemsInserted,
	}
}
