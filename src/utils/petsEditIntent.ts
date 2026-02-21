const PETS_EDIT_INTENT_KEY = 'pet-breeder-cards.pets-edit-intent'

export const setPetsEditIntent = (petId: string): void => {
	if (typeof window === 'undefined') {
		return
	}
	window.localStorage.setItem(PETS_EDIT_INTENT_KEY, petId)
}

export const getPetsEditIntent = (): string | null => {
	if (typeof window === 'undefined') {
		return null
	}
	return window.localStorage.getItem(PETS_EDIT_INTENT_KEY)
}

export const clearPetsEditIntent = (): void => {
	if (typeof window === 'undefined') {
		return
	}
	window.localStorage.removeItem(PETS_EDIT_INTENT_KEY)
}
