import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import type { Pet } from '../../models'
import type { PetBreederCardsDb } from '../database'
import { seedDatabase } from '../seed'
import { createTestDb, disposeTestDb } from '../testDb'
import { exportBackupData, importBackupData, parseBackupPayload } from './backupService'

let sourceDb: PetBreederCardsDb | null = null
let restoreDb: PetBreederCardsDb | null = null

const getFirstProfileId = async (database: PetBreederCardsDb): Promise<string> => {
	const profile = await database.profiles.toCollection().first()
	if (!profile) {
		throw new Error('Expected seeded profile to exist.')
	}
	return profile.id
}

afterEach(async () => {
	if (sourceDb) {
		await disposeTestDb(sourceDb)
		sourceDb = null
	}
	if (restoreDb) {
		await disposeTestDb(restoreDb)
		restoreDb = null
	}
})

describe('backupService', () => {
	it('exports full payload including photos as data URLs', async () => {
		sourceDb = await createTestDb()
		await seedDatabase(sourceDb)
		const profileId = await getFirstProfileId(sourceDb)

		await sourceDb.photos.add({
			id: 'photo-1',
			blob: new Blob(['photo-bytes'], { type: 'text/plain' }),
			mimeType: 'text/plain',
			createdAt: new Date().toISOString(),
		})
		const pet: Pet = {
			id: 'pet-1',
			profileId,
			name: 'Fluffy',
			species: 'cat',
			gender: 'female',
			wasWild: false,
			tags: ['starter'],
			breedCount: 0,
			photoId: 'photo-1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}
		await sourceDb.pets.add(pet)

		const payload = await exportBackupData(sourceDb)

		expect(payload.schemaVersion).toBe(1)
		expect(payload.data.photos).toHaveLength(1)
		expect(payload.data.photos[0]?.dataUrl.startsWith('data:text/plain;base64,')).toBe(true)
		expect(payload.data.pets.some((row) => row.id === 'pet-1')).toBe(true)
	})

	it('imports payload and restores photos and records', async () => {
		sourceDb = await createTestDb()
		await seedDatabase(sourceDb)
		const profileId = await getFirstProfileId(sourceDb)

		await sourceDb.photos.add({
			id: 'photo-2',
			blob: new Blob(['hello-cheese'], { type: 'text/plain' }),
			mimeType: 'text/plain',
			createdAt: new Date().toISOString(),
		})
		await sourceDb.pets.add({
			id: 'pet-2',
			profileId,
			name: 'Cheese',
			species: 'cat',
			gender: 'female',
			wasWild: false,
			tags: ['favorite'],
			breedCount: 1,
			photoId: 'photo-2',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})

		const payload = await exportBackupData(sourceDb)
		const serializedPhoto = payload.data.photos.find((photo) => photo.id === 'photo-2')
		expect(serializedPhoto?.dataUrl.startsWith('data:text/plain;base64,')).toBe(true)
		restoreDb = await createTestDb()
		await importBackupData(restoreDb, parseBackupPayload(payload))

		expect(await restoreDb.profiles.count()).toBe(await sourceDb.profiles.count())
		expect(await restoreDb.pets.count()).toBe(await sourceDb.pets.count())
		expect(await restoreDb.storeItems.count()).toBe(await sourceDb.storeItems.count())

		const restoredPhoto = await restoreDb.photos.get('photo-2')
		expect(restoredPhoto).toBeDefined()
		expect(restoredPhoto?.mimeType).toBe('text/plain')
	})
})
