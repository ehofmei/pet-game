import { createDb, type PetBreederCardsDb } from './database'

const buildTestDbName = (): string =>
	`petBreederCardsDb-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const createTestDb = async (): Promise<PetBreederCardsDb> => {
	const db = createDb(buildTestDbName())
	await db.open()
	return db
}

export const disposeTestDb = async (db: PetBreederCardsDb): Promise<void> => {
	db.close()
	await db.delete()
}
