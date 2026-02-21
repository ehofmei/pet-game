import type { Photo } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreatePhotoInput = {
	blob: Blob
	mimeType: string
}

export class PhotoRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async getById(id: string): Promise<Photo | undefined> {
		return await this.db.photos.get(id)
	}

	async create(input: CreatePhotoInput): Promise<Photo> {
		const photo: Photo = {
			id: createId(),
			blob: input.blob,
			mimeType: input.mimeType,
			createdAt: nowIso(),
		}
		await this.db.photos.add(photo)
		return photo
	}

	async delete(id: string): Promise<void> {
		await this.db.photos.delete(id)
	}
}
