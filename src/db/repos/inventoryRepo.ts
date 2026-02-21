import type { InventoryItem } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type UpsertInventoryItemInput = {
	profileId: string
	itemId: string
	quantityDelta: number
}

export class InventoryRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async listByProfile(profileId: string): Promise<InventoryItem[]> {
		return await this.db.inventoryItems.where('profileId').equals(profileId).toArray()
	}

	async getByProfileAndItem(profileId: string, itemId: string): Promise<InventoryItem | undefined> {
		return await this.db.inventoryItems.where('[profileId+itemId]').equals([profileId, itemId]).first()
	}

	async upsertQuantity(input: UpsertInventoryItemInput): Promise<InventoryItem> {
		const existing = await this.getByProfileAndItem(input.profileId, input.itemId)
		const timestamp = nowIso()

		if (existing) {
			const nextQuantity = Math.max(0, existing.quantity + input.quantityDelta)
			await this.db.inventoryItems.update(existing.id, {
				quantity: nextQuantity,
				updatedAt: timestamp,
			})
			return { ...existing, quantity: nextQuantity, updatedAt: timestamp }
		}

		const item: InventoryItem = {
			id: createId(),
			profileId: input.profileId,
			itemId: input.itemId,
			quantity: Math.max(0, input.quantityDelta),
			createdAt: timestamp,
			updatedAt: timestamp,
		}
		await this.db.inventoryItems.add(item)
		return item
	}
}
