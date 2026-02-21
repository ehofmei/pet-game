import type { Pet, PetGender, PetSpecies } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreatePetInput = {
	profileId: string
	name: string
	species: PetSpecies
	gender: PetGender
	wasWild: boolean
	tags?: string[]
	breedCount?: number
	photoId?: string | null
	notes?: string
}

export type UpdatePetInput = Partial<Omit<CreatePetInput, 'profileId'>> & {
	profileId?: string
}

export class PetRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async listByProfile(profileId: string): Promise<Pet[]> {
		return await this.db.pets.where('profileId').equals(profileId).sortBy('createdAt')
	}

	async getById(id: string): Promise<Pet | undefined> {
		return await this.db.pets.get(id)
	}

	async create(input: CreatePetInput): Promise<Pet> {
		const timestamp = nowIso()
		const pet: Pet = {
			id: createId(),
			profileId: input.profileId,
			name: input.name.trim(),
			species: input.species,
			gender: input.gender,
			wasWild: input.wasWild,
			tags: input.tags ?? [],
			breedCount: input.breedCount ?? 0,
			photoId: input.photoId ?? null,
			notes: input.notes,
			createdAt: timestamp,
			updatedAt: timestamp,
		}
		await this.db.pets.add(pet)
		return pet
	}

	async update(id: string, input: UpdatePetInput): Promise<void> {
		const changes = {
			...input,
			name: input.name?.trim(),
			updatedAt: nowIso(),
		}
		await this.db.pets.update(id, changes)
	}

	async delete(id: string): Promise<void> {
		await this.db.pets.delete(id)
	}
}
