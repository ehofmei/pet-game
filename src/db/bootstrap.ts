import type { PetBreederCardsDb } from './database'
import { appDb } from './database'
import { seedDatabase } from './seed'

let bootstrapPromise: Promise<void> | null = null

export const initializeDatabase = async (db: PetBreederCardsDb = appDb): Promise<void> => {
	if (bootstrapPromise) {
		return await bootstrapPromise
	}

	bootstrapPromise = (async () => {
		if (!db.isOpen()) {
			await db.open()
		}
		await seedDatabase(db)
	})()

	return await bootstrapPromise
}

export const resetDatabaseBootstrapForTests = (): void => {
	bootstrapPromise = null
}
