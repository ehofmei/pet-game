export type PetSpecies = 'cat' | 'dog' | 'bird' | 'bunny' | 'other' | 'mixed'
export type PetGender = 'male' | 'female' | 'unknown'

export type Pet = {
	id: string
	profileId: string
	name: string
	species: PetSpecies
	gender: PetGender
	wasWild: boolean
	tags: string[]
	breedCount: number
	photoId: string | null
	notes?: string
	createdAt: string
	updatedAt: string
}
