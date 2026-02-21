export type StoreItemType = 'pet' | 'supply' | 'breedingSession'
export type SpeciesRestriction = 'cat' | 'dog' | 'bird' | 'bunny' | 'other' | 'mixed' | null

export type StoreItem = {
	id: string
	type: StoreItemType
	name: string
	description: string
	speciesRestriction: SpeciesRestriction
	pricePetCoins: number
	priceCoins: number
	photoId: string | null
	tags: string[]
	isActive: boolean
	createdAt: string
	updatedAt: string
}
