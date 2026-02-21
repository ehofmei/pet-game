import type { StoreItem, StoreItemType } from '../../models'
import { nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreateStoreItemInput = Omit<StoreItem, 'createdAt' | 'updatedAt'>

export class StoreRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async listActive(): Promise<StoreItem[]> {
		return await this.db.storeItems
			.toCollection()
			.filter((item) => item.isActive)
			.sortBy('name')
	}

	async listAll(): Promise<StoreItem[]> {
		return await this.db.storeItems.toCollection().sortBy('name')
	}

	async getById(id: string): Promise<StoreItem | undefined> {
		return await this.db.storeItems.get(id)
	}

	async listByType(type: StoreItemType): Promise<StoreItem[]> {
		return await this.db.storeItems.where('type').equals(type).toArray()
	}

	async put(item: CreateStoreItemInput): Promise<void> {
		const timestamp = nowIso()
		await this.db.storeItems.put({
			...item,
			createdAt: timestamp,
			updatedAt: timestamp,
		})
	}

	async bulkPut(items: CreateStoreItemInput[]): Promise<void> {
		const timestamp = nowIso()
		await this.db.storeItems.bulkPut(
			items.map((item) => ({
				...item,
				createdAt: timestamp,
				updatedAt: timestamp,
			})),
		)
	}

	async deleteById(id: string): Promise<void> {
		await this.db.storeItems.delete(id)
	}
}
