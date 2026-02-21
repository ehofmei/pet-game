import Dexie, { type Table } from 'dexie'
import type {
	BreedingEvent,
	InventoryItem,
	Pet,
	Photo,
	Profile,
	StoreItem,
	TransactionLog,
	Wallet,
} from '../models'

export class PetBreederCardsDb extends Dexie {
	profiles!: Table<Profile, string>
	pets!: Table<Pet, string>
	photos!: Table<Photo, string>
	inventoryItems!: Table<InventoryItem, string>
	storeItems!: Table<StoreItem, string>
	wallets!: Table<Wallet, string>
	transactionLogs!: Table<TransactionLog, string>
	breedingEvents!: Table<BreedingEvent, string>

	constructor(databaseName = 'petBreederCardsDb') {
		super(databaseName)

		this.version(1).stores({
			profiles: 'id, name, createdAt, updatedAt',
			pets: 'id, profileId, species, gender, wasWild, createdAt, updatedAt',
			photos: 'id, createdAt',
			inventoryItems: 'id, profileId, itemId, [profileId+itemId], createdAt, updatedAt',
			storeItems: 'id, type, speciesRestriction, isActive, createdAt, updatedAt',
			wallets: 'profileId, updatedAt',
			transactionLogs: 'id, profileId, kind, createdAt',
			breedingEvents: 'id, profileId, parentAId, parentBId, babyPetId, createdAt',
		})
	}
}

export const createDb = (databaseName?: string): PetBreederCardsDb =>
	new PetBreederCardsDb(databaseName)

export const appDb = createDb()
