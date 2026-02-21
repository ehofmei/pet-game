import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

const TEST_DB_NAME = 'pet-breeder-cards-indexeddb-test'
const TEST_STORE_NAME = 'pets'

const deleteTestDb = async (): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase(TEST_DB_NAME)
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => reject(new Error('Delete database blocked by open connection'))
	})
}

const openTestDb = async (): Promise<IDBDatabase> => {
	return await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(TEST_DB_NAME, 1)

		request.onupgradeneeded = () => {
			request.result.createObjectStore(TEST_STORE_NAME, { keyPath: 'id' })
		}
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

const putRecord = async (db: IDBDatabase, record: { id: string; name: string }): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(TEST_STORE_NAME, 'readwrite')
		tx.objectStore(TEST_STORE_NAME).put(record)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

const getRecord = async (db: IDBDatabase, id: string): Promise<{ id: string; name: string } | undefined> => {
	return await new Promise<{ id: string; name: string } | undefined>((resolve, reject) => {
		const tx = db.transaction(TEST_STORE_NAME, 'readonly')
		const request = tx.objectStore(TEST_STORE_NAME).get(id)
		request.onsuccess = () => resolve(request.result as { id: string; name: string } | undefined)
		request.onerror = () => reject(request.error)
	})
}

afterEach(async () => {
	await deleteTestDb()
})

describe('IndexedDB test harness', () => {
	it('writes and reads a record', async () => {
		const db = await openTestDb()
		await putRecord(db, { id: 'pet-1', name: 'Muffin' })

		const record = await getRecord(db, 'pet-1')
		db.close()

		expect(record).toEqual({ id: 'pet-1', name: 'Muffin' })
	})
})
