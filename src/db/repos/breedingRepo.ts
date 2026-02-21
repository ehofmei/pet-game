import type { BreedingEvent } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreateBreedingEventInput = {
	profileId: string
	parentAId: string
	parentBId: string
	babyPetId: string
	usedBreedingSessionItem: boolean
}

export class BreedingRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async create(input: CreateBreedingEventInput): Promise<BreedingEvent> {
		const event: BreedingEvent = {
			id: createId(),
			profileId: input.profileId,
			parentAId: input.parentAId,
			parentBId: input.parentBId,
			babyPetId: input.babyPetId,
			usedBreedingSessionItem: input.usedBreedingSessionItem,
			createdAt: nowIso(),
		}
		await this.db.breedingEvents.add(event)
		return event
	}

	async listByProfile(profileId: string): Promise<BreedingEvent[]> {
		return await this.db.breedingEvents.where('profileId').equals(profileId).sortBy('createdAt')
	}

	async listByPetId(petId: string): Promise<BreedingEvent[]> {
		return await this.db.breedingEvents
			.filter((event) => event.parentAId === petId || event.parentBId === petId || event.babyPetId === petId)
			.sortBy('createdAt')
	}
}
