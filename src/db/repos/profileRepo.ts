import type { Profile } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreateProfileInput = {
	name: string
}

export class ProfileRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async list(): Promise<Profile[]> {
		return await this.db.profiles.orderBy('createdAt').toArray()
	}

	async getById(id: string): Promise<Profile | undefined> {
		return await this.db.profiles.get(id)
	}

	async count(): Promise<number> {
		return await this.db.profiles.count()
	}

	async create(input: CreateProfileInput): Promise<Profile> {
		const timestamp = nowIso()
		const profile: Profile = {
			id: createId(),
			name: input.name.trim(),
			createdAt: timestamp,
			updatedAt: timestamp,
		}
		await this.db.profiles.add(profile)
		return profile
	}

	async rename(id: string, name: string): Promise<void> {
		await this.db.profiles.update(id, {
			name: name.trim(),
			updatedAt: nowIso(),
		})
	}

	async delete(id: string): Promise<void> {
		await this.db.profiles.delete(id)
	}
}
