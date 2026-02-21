import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { appDb, resetDatabaseBootstrapForTests } from '../db'

beforeEach(async () => {
	resetDatabaseBootstrapForTests()
	if (!appDb.isOpen()) {
		await appDb.open()
	}
	await appDb.transaction('rw', appDb.tables, async () => {
		for (const table of appDb.tables) {
			await table.clear()
		}
	})
	appDb.close()
	window.localStorage.clear()
})

afterEach(() => {
	cleanup()
	window.location.hash = ''
})
