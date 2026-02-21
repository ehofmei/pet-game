import type { BreedingEvent, InventoryItem, Pet, StoreItem, TransactionLog, Wallet } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

type BreedingSessionOption = {
	storeItem: StoreItem
	inventoryItem: InventoryItem | null
}

export class BreedingError extends Error {
	code: 'NOT_FOUND' | 'INVALID_INPUT' | 'INSUFFICIENT_FUNDS' | 'BREEDING_SESSION_REQUIRED'

	constructor(message: string, code: BreedingError['code']) {
		super(message)
		this.code = code
	}
}

export type RunBreedingInput = {
	profileId: string
	parentAId: string
	parentBId: string
	allowCrossSpecies: boolean
	autoBuySessionIfNeeded: boolean
}

export type RunBreedingResult = {
	parentA: Pet
	parentB: Pet
	babyPet: Pet
	breedingEvent: BreedingEvent
	transactionLog: TransactionLog
	wallet: Wallet
	usedBreedingSessionItem: boolean
	purchasedBreedingSession: boolean
	breedingSessionStoreItem: StoreItem
}

const createWalletRecord = (profileId: string): Wallet => ({
	profileId,
	petCoins: 0,
	coins: 0,
	updatedAt: nowIso(),
})

const toLower = (value: string): string => value.trim().toLowerCase()

const isBreedingSessionStoreItem = (item: StoreItem): boolean => {
	if (!item.isActive) {
		return false
	}
	if (item.type === 'breedingSession') {
		return true
	}
	return item.tags.some((tag) => toLower(tag) === 'breedingsession')
}

const sortBreedingSessionItems = (items: StoreItem[]): StoreItem[] =>
	[...items].sort((a, b) => {
		if (a.priceCoins !== b.priceCoins) {
			return a.priceCoins - b.priceCoins
		}
		if (a.pricePetCoins !== b.pricePetCoins) {
			return a.pricePetCoins - b.pricePetCoins
		}
		return a.id.localeCompare(b.id)
	})

const createTransaction = ({
	profileId,
	deltaPetCoins,
	deltaCoins,
	notes,
}: {
	profileId: string
	deltaPetCoins: number
	deltaCoins: number
	notes: string
}): TransactionLog => ({
	id: createId(),
	profileId,
	kind: 'breeding',
	deltaPetCoins: Object.is(deltaPetCoins, -0) ? 0 : deltaPetCoins,
	deltaCoins: Object.is(deltaCoins, -0) ? 0 : deltaCoins,
	notes: notes.trim(),
	createdAt: nowIso(),
})

const createBreedingEvent = ({
	profileId,
	parentAId,
	parentBId,
	babyPetId,
	usedBreedingSessionItem,
}: {
	profileId: string
	parentAId: string
	parentBId: string
	babyPetId: string
	usedBreedingSessionItem: boolean
}): BreedingEvent => ({
	id: createId(),
	profileId,
	parentAId,
	parentBId,
	babyPetId,
	usedBreedingSessionItem,
	createdAt: nowIso(),
})

const getBabySpecies = (parentA: Pet, parentB: Pet): Pet['species'] =>
	parentA.species === parentB.species ? parentA.species : 'mixed'

const getBabyTags = (parentA: Pet, parentB: Pet): string[] =>
	Array.from(new Set([...parentA.tags, ...parentB.tags, 'baby']))

export class BreedingService {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	private async ensureWallet(profileId: string): Promise<Wallet> {
		const existing = await this.db.wallets.get(profileId)
		if (existing) {
			return existing
		}

		const wallet = createWalletRecord(profileId)
		await this.db.wallets.add(wallet)
		return wallet
	}

	private async getParentPet(profileId: string, petId: string, label: 'A' | 'B'): Promise<Pet> {
		const pet = await this.db.pets.get(petId)
		if (!pet || pet.profileId !== profileId) {
			throw new BreedingError(`Parent ${label} was not found in this profile.`, 'NOT_FOUND')
		}
		return pet
	}

	private async resolveBreedingSessionOption(profileId: string): Promise<{
		inventoryOption: BreedingSessionOption | null
		fallbackStoreItem: StoreItem
	}> {
		const storeItems = await this.db.storeItems.toArray()
		const sessionItems = sortBreedingSessionItems(storeItems.filter(isBreedingSessionStoreItem))
		if (sessionItems.length === 0) {
			throw new BreedingError('No breeding session item is available in Store.', 'NOT_FOUND')
		}

		const inventoryItems = await this.db.inventoryItems.where('profileId').equals(profileId).toArray()
		const inventoryByItemId = new Map(inventoryItems.map((item) => [item.itemId, item]))
		const inventoryOption =
			sessionItems
				.map((storeItem) => ({
					storeItem,
					inventoryItem: inventoryByItemId.get(storeItem.id) ?? null,
				}))
				.find((option) => (option.inventoryItem?.quantity ?? 0) > 0) ?? null

		return {
			inventoryOption,
			fallbackStoreItem: sessionItems[0],
		}
	}

	async runBreeding(input: RunBreedingInput): Promise<RunBreedingResult> {
		if (input.parentAId === input.parentBId) {
			throw new BreedingError('Parent A and Parent B must be different pets.', 'INVALID_INPUT')
		}

		const result = await this.db.transaction(
			'rw',
			[
				this.db.pets,
				this.db.wallets,
				this.db.storeItems,
				this.db.inventoryItems,
				this.db.breedingEvents,
				this.db.transactionLogs,
			],
			async () => {
				const parentA = await this.getParentPet(input.profileId, input.parentAId, 'A')
				const parentB = await this.getParentPet(input.profileId, input.parentBId, 'B')
				if (!input.allowCrossSpecies && parentA.species !== parentB.species) {
					throw new BreedingError('Cross-species breeding is disabled.', 'INVALID_INPUT')
				}

				const sessionResolution = await this.resolveBreedingSessionOption(input.profileId)
				let wallet = await this.ensureWallet(input.profileId)

				let usedBreedingSessionItem = false
				let purchasedBreedingSession = false
				let deltaPetCoins = 0
				let deltaCoins = 0
				let breedingSessionStoreItem: StoreItem

				if (sessionResolution.inventoryOption) {
					const { storeItem, inventoryItem } = sessionResolution.inventoryOption
					if (!inventoryItem || inventoryItem.quantity <= 0) {
						throw new BreedingError('Breeding session inventory is unavailable.', 'NOT_FOUND')
					}

					const updatedInventory: InventoryItem = {
						...inventoryItem,
						quantity: Math.max(0, inventoryItem.quantity - 1),
						updatedAt: nowIso(),
					}
					await this.db.inventoryItems.put(updatedInventory)

					usedBreedingSessionItem = true
					breedingSessionStoreItem = storeItem
				} else {
					if (!input.autoBuySessionIfNeeded) {
						throw new BreedingError(
							'No breeding session token in inventory. Buy one with coins to continue.',
							'BREEDING_SESSION_REQUIRED',
						)
					}

					const fallbackStoreItem = sessionResolution.fallbackStoreItem
					if (
						wallet.petCoins < fallbackStoreItem.pricePetCoins ||
						wallet.coins < fallbackStoreItem.priceCoins
					) {
						throw new BreedingError('Not enough balance to buy a breeding session.', 'INSUFFICIENT_FUNDS')
					}

					wallet = {
						...wallet,
						petCoins: wallet.petCoins - fallbackStoreItem.pricePetCoins,
						coins: wallet.coins - fallbackStoreItem.priceCoins,
						updatedAt: nowIso(),
					}
					await this.db.wallets.put(wallet)

					deltaPetCoins = -fallbackStoreItem.pricePetCoins
					deltaCoins = -fallbackStoreItem.priceCoins
					purchasedBreedingSession = true
					breedingSessionStoreItem = fallbackStoreItem
				}

				const updatedParentA: Pet = {
					...parentA,
					breedCount: parentA.breedCount + 1,
					updatedAt: nowIso(),
				}
				const updatedParentB: Pet = {
					...parentB,
					breedCount: parentB.breedCount + 1,
					updatedAt: nowIso(),
				}
				await this.db.pets.put(updatedParentA)
				await this.db.pets.put(updatedParentB)

				const babyPet: Pet = {
					id: createId(),
					profileId: input.profileId,
					name: `Baby of ${parentA.name} + ${parentB.name}`,
					species: getBabySpecies(parentA, parentB),
					gender: 'unknown',
					wasWild: false,
					tags: getBabyTags(parentA, parentB),
					breedCount: 0,
					photoId: null,
					notes: `Bred from ${parentA.name} + ${parentB.name}.`,
					createdAt: nowIso(),
					updatedAt: nowIso(),
				}
				await this.db.pets.add(babyPet)

				const breedingEvent = createBreedingEvent({
					profileId: input.profileId,
					parentAId: parentA.id,
					parentBId: parentB.id,
					babyPetId: babyPet.id,
					usedBreedingSessionItem,
				})
				await this.db.breedingEvents.add(breedingEvent)

				const transactionLog = createTransaction({
					profileId: input.profileId,
					deltaPetCoins,
					deltaCoins,
					notes:
						deltaPetCoins === 0 && deltaCoins === 0
							? `Breeding: ${parentA.name} + ${parentB.name} used "${breedingSessionStoreItem.name}" from inventory.`
							: `Breeding: ${parentA.name} + ${parentB.name} bought and used "${breedingSessionStoreItem.name}".`,
				})
				await this.db.transactionLogs.add(transactionLog)

				return {
					parentA: updatedParentA,
					parentB: updatedParentB,
					babyPet,
					breedingEvent,
					transactionLog,
					wallet,
					usedBreedingSessionItem,
					purchasedBreedingSession,
					breedingSessionStoreItem,
				}
			},
		)

		return result
	}
}
