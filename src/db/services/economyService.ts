import type { InventoryItem, Pet, PetSpecies, StoreItem, TransactionLog, Wallet } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export class EconomyError extends Error {
	code: 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'INVALID_INPUT'

	constructor(message: string, code: EconomyError['code']) {
		super(message)
		this.code = code
	}
}

export type PurchaseInput = {
	profileId: string
	storeItemId: string
}

export type PurchaseResult = {
	storeItem: StoreItem
	wallet: Wallet
	createdPetId?: string
	inventoryItem?: InventoryItem
	transactionLog: TransactionLog
}

export type EconomyAdjustWalletInput = {
	profileId: string
	deltaPetCoins: number
	deltaCoins: number
	notes: string
}

export type EconomyAdjustWalletResult = {
	wallet: Wallet
	transactionLog: TransactionLog
}

export type EconomyAdjustInventoryInput = {
	profileId: string
	itemId: string
	quantityDelta: number
	notes: string
}

export type EconomyAdjustInventoryResult = {
	inventoryItem: InventoryItem
	transactionLog: TransactionLog
}

export type AddStoreItemInput = {
	type: StoreItem['type']
	name: string
	description: string
	speciesRestriction: StoreItem['speciesRestriction']
	pricePetCoins: number
	priceCoins: number
	photoId: string | null
	tags: string[]
	isActive: boolean
}

export type UpdateStoreItemInput = AddStoreItemInput & {
	id: string
}

const toPetSpecies = (storeItem: StoreItem): PetSpecies => {
	if (!storeItem.speciesRestriction) {
		return 'other'
	}
	return storeItem.speciesRestriction
}

const createWalletRecord = (profileId: string): Wallet => ({
	profileId,
	petCoins: 0,
	coins: 0,
	updatedAt: nowIso(),
})

const createTransaction = ({
	profileId,
	kind,
	deltaPetCoins,
	deltaCoins,
	notes,
}: {
	profileId: string
	kind: TransactionLog['kind']
	deltaPetCoins: number
	deltaCoins: number
	notes: string
}): TransactionLog => ({
	id: createId(),
	profileId,
	kind,
	deltaPetCoins,
	deltaCoins,
	notes: notes.trim(),
	createdAt: nowIso(),
})

const slugify = (value: string): string => {
	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return slug || 'item'
}

export const createCustomStoreItemId = (name: string): string => {
	return `custom-${slugify(name)}-${createId().slice(0, 8)}`
}

const normalizeStoreItemPrices = (input: { type: StoreItem['type']; pricePetCoins: number; priceCoins: number }) => {
	if (input.type === 'pet') {
		return {
			pricePetCoins: Math.max(0, input.pricePetCoins),
			priceCoins: 0,
		}
	}

	return {
		pricePetCoins: 0,
		priceCoins: Math.max(0, input.priceCoins),
	}
}

export class EconomyService {
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

	private async getStoreItem(storeItemId: string): Promise<StoreItem> {
		const storeItem = await this.db.storeItems.get(storeItemId)
		if (!storeItem || !storeItem.isActive) {
			throw new EconomyError('Store item is unavailable.', 'NOT_FOUND')
		}
		return storeItem
	}

	async getWallet(profileId: string): Promise<Wallet> {
		return await this.ensureWallet(profileId)
	}

	async purchaseStoreItem(input: PurchaseInput): Promise<PurchaseResult> {
		const storeItem = await this.getStoreItem(input.storeItemId)

		const result = await this.db.transaction(
			'rw',
			[
				this.db.wallets,
				this.db.storeItems,
				this.db.inventoryItems,
				this.db.pets,
				this.db.transactionLogs,
			],
			async () => {
				const wallet = await this.ensureWallet(input.profileId)
				if (wallet.petCoins < storeItem.pricePetCoins || wallet.coins < storeItem.priceCoins) {
					throw new EconomyError('Not enough balance to complete this purchase.', 'INSUFFICIENT_FUNDS')
				}

				const updatedWallet: Wallet = {
					...wallet,
					petCoins: wallet.petCoins - storeItem.pricePetCoins,
					coins: wallet.coins - storeItem.priceCoins,
					updatedAt: nowIso(),
				}
				await this.db.wallets.put(updatedWallet)

				let createdPetId: string | undefined
				let inventoryItem: InventoryItem | undefined
				let transactionLog: TransactionLog

				if (storeItem.type === 'pet') {
					const pet: Pet = {
						id: createId(),
						profileId: input.profileId,
						name: storeItem.name,
						species: toPetSpecies(storeItem),
						gender: 'unknown',
						wasWild: false,
						tags: [...storeItem.tags],
						breedCount: 0,
						photoId: storeItem.photoId,
						notes: `Purchased from store: ${storeItem.name}`,
						createdAt: nowIso(),
						updatedAt: nowIso(),
					}
					await this.db.pets.add(pet)
					createdPetId = pet.id
					transactionLog = createTransaction({
						profileId: input.profileId,
						kind: 'buyPet',
						deltaPetCoins: -storeItem.pricePetCoins,
						deltaCoins: -storeItem.priceCoins,
						notes: `Purchased pet item "${storeItem.name}"`,
					})
				} else {
					const existing = await this.db.inventoryItems
						.where('[profileId+itemId]')
						.equals([input.profileId, storeItem.id])
						.first()

					if (existing) {
						inventoryItem = {
							...existing,
							quantity: existing.quantity + 1,
							updatedAt: nowIso(),
						}
						await this.db.inventoryItems.put(inventoryItem)
					} else {
						inventoryItem = {
							id: createId(),
							profileId: input.profileId,
							itemId: storeItem.id,
							quantity: 1,
							createdAt: nowIso(),
							updatedAt: nowIso(),
						}
						await this.db.inventoryItems.add(inventoryItem)
					}

					transactionLog = createTransaction({
						profileId: input.profileId,
						kind: 'buyItem',
						deltaPetCoins: -storeItem.pricePetCoins,
						deltaCoins: -storeItem.priceCoins,
						notes: `Purchased item "${storeItem.name}"`,
					})
				}

				await this.db.transactionLogs.add(transactionLog)

				return {
					storeItem,
					wallet: updatedWallet,
					createdPetId,
					inventoryItem,
					transactionLog,
				}
			},
		)

		return result
	}

	async adjustWallet(input: EconomyAdjustWalletInput): Promise<EconomyAdjustWalletResult> {
		if (!input.notes.trim()) {
			throw new EconomyError('Adjustment reason is required.', 'INVALID_INPUT')
		}

		const result = await this.db.transaction('rw', [this.db.wallets, this.db.transactionLogs], async () => {
			const wallet = await this.ensureWallet(input.profileId)
			const updatedWallet: Wallet = {
				...wallet,
				petCoins: wallet.petCoins + input.deltaPetCoins,
				coins: wallet.coins + input.deltaCoins,
				updatedAt: nowIso(),
			}
			await this.db.wallets.put(updatedWallet)

			const transactionLog = createTransaction({
				profileId: input.profileId,
				kind: 'adjustment',
				deltaPetCoins: input.deltaPetCoins,
				deltaCoins: input.deltaCoins,
				notes: input.notes,
			})
			await this.db.transactionLogs.add(transactionLog)

			return {
				wallet: updatedWallet,
				transactionLog,
			}
		})

		return result
	}

	async adjustInventory(input: EconomyAdjustInventoryInput): Promise<EconomyAdjustInventoryResult> {
		if (!input.notes.trim()) {
			throw new EconomyError('Adjustment reason is required.', 'INVALID_INPUT')
		}

		const storeItem = await this.db.storeItems.get(input.itemId)
		if (!storeItem) {
			throw new EconomyError('Inventory item does not exist in store catalog.', 'NOT_FOUND')
		}

		const result = await this.db.transaction(
			'rw',
			[this.db.inventoryItems, this.db.transactionLogs],
			async () => {
				const existing = await this.db.inventoryItems
					.where('[profileId+itemId]')
					.equals([input.profileId, input.itemId])
					.first()

				let inventoryItem: InventoryItem
				if (existing) {
					inventoryItem = {
						...existing,
						quantity: Math.max(0, existing.quantity + input.quantityDelta),
						updatedAt: nowIso(),
					}
					await this.db.inventoryItems.put(inventoryItem)
				} else {
					inventoryItem = {
						id: createId(),
						profileId: input.profileId,
						itemId: input.itemId,
						quantity: Math.max(0, input.quantityDelta),
						createdAt: nowIso(),
						updatedAt: nowIso(),
					}
					await this.db.inventoryItems.add(inventoryItem)
				}

				const transactionLog = createTransaction({
					profileId: input.profileId,
					kind: 'adjustment',
					deltaPetCoins: 0,
					deltaCoins: 0,
					notes: `${input.notes} (${storeItem.name}, change ${input.quantityDelta})`,
				})
				await this.db.transactionLogs.add(transactionLog)

				return {
					inventoryItem,
					transactionLog,
				}
			},
		)

		return result
	}

	async addCustomStoreItem(input: AddStoreItemInput): Promise<StoreItem> {
		if (!input.name.trim()) {
			throw new EconomyError('Store item name is required.', 'INVALID_INPUT')
		}

		const timestamp = nowIso()
		const normalizedPrices = normalizeStoreItemPrices({
			type: input.type,
			pricePetCoins: input.pricePetCoins,
			priceCoins: input.priceCoins,
		})
		const storeItem: StoreItem = {
			id: createCustomStoreItemId(input.name),
			type: input.type,
			name: input.name.trim(),
			description: input.description.trim(),
			speciesRestriction: input.speciesRestriction,
			pricePetCoins: normalizedPrices.pricePetCoins,
			priceCoins: normalizedPrices.priceCoins,
			photoId: input.photoId,
			tags: input.tags,
			isActive: input.isActive,
			createdAt: timestamp,
			updatedAt: timestamp,
		}

		await this.db.storeItems.put(storeItem)
		return storeItem
	}

	async updateStoreItem(input: UpdateStoreItemInput): Promise<StoreItem> {
		if (!input.name.trim()) {
			throw new EconomyError('Store item name is required.', 'INVALID_INPUT')
		}

		const existing = await this.db.storeItems.get(input.id)
		if (!existing) {
			throw new EconomyError('Store item does not exist.', 'NOT_FOUND')
		}

		const normalizedPrices = normalizeStoreItemPrices({
			type: input.type,
			pricePetCoins: input.pricePetCoins,
			priceCoins: input.priceCoins,
		})
		const updatedItem: StoreItem = {
			...existing,
			type: input.type,
			name: input.name.trim(),
			description: input.description.trim(),
			speciesRestriction: input.speciesRestriction,
			pricePetCoins: normalizedPrices.pricePetCoins,
			priceCoins: normalizedPrices.priceCoins,
			photoId: input.photoId,
			tags: input.tags,
			isActive: input.isActive,
			updatedAt: nowIso(),
		}

		await this.db.storeItems.put(updatedItem)
		return updatedItem
	}

	async deleteStoreItem(storeItemId: string): Promise<void> {
		const existing = await this.db.storeItems.get(storeItemId)
		if (!existing) {
			throw new EconomyError('Store item does not exist.', 'NOT_FOUND')
		}
		await this.db.storeItems.delete(storeItemId)
	}
}
