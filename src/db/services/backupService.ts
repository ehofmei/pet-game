import type {
	BreedingEvent,
	InventoryItem,
	Pet,
	Photo,
	Profile,
	StoreItem,
	TransactionLog,
	Wallet,
} from '../../models'
import type { PetBreederCardsDb } from '../database'

export type BackupPhoto = {
	id: string
	mimeType: string
	createdAt: string
	dataUrl: string
}

export type BackupPayloadV1 = {
	schemaVersion: 1
	exportedAt: string
	data: {
		profiles: Profile[]
		pets: Pet[]
		photos: BackupPhoto[]
		inventoryItems: InventoryItem[]
		storeItems: StoreItem[]
		wallets: Wallet[]
		transactionLogs: TransactionLog[]
		breedingEvents: BreedingEvent[]
	}
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const assertArray = <T>(value: unknown, fieldName: string): T[] => {
	if (!Array.isArray(value)) {
		throw new Error(`Backup field "${fieldName}" must be an array.`)
	}
	return value as T[]
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	const chunkSize = 0x8000
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		const chunk = bytes.subarray(offset, offset + chunkSize)
		binary += String.fromCharCode(...chunk)
	}
	return globalThis.btoa(binary)
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
	const binary = globalThis.atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes.buffer
}

const toArrayBuffer = async (value: unknown, mimeType: string): Promise<ArrayBuffer> => {
	if (value instanceof ArrayBuffer) {
		return value
	}
	if (ArrayBuffer.isView(value)) {
		const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
		return bytes.slice().buffer
	}
	if (value instanceof Blob) {
		return await value.arrayBuffer()
	}
	if (isRecord(value)) {
		if (typeof value.arrayBuffer === 'function') {
			return await (value.arrayBuffer as () => Promise<ArrayBuffer>)()
		}
		if ('_buffer' in value) {
			return await toArrayBuffer(value._buffer, mimeType)
		}
		if ('buffer' in value) {
			return await toArrayBuffer(value.buffer, mimeType)
		}
		if (Array.isArray(value.data)) {
			return Uint8Array.from(value.data as number[]).buffer
		}
	}

	const fallbackBlob = new Blob([value as BlobPart], { type: mimeType })
	return await fallbackBlob.arrayBuffer()
}

const photoToBackupPhoto = async (photo: Photo): Promise<BackupPhoto> => {
	const mimeType = photo.mimeType || photo.blob.type || 'application/octet-stream'
	const dataUrl = `data:${mimeType};base64,${arrayBufferToBase64(await toArrayBuffer(photo.blob, mimeType))}`
	return {
		id: photo.id,
		mimeType,
		createdAt: photo.createdAt,
		dataUrl,
	}
}

const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } => {
	const match = /^data:([^;]+);base64,(.+)$/u.exec(dataUrl)
	if (!match) {
		throw new Error('Backup photo data URL is invalid.')
	}
	return {
		mimeType: match[1],
		base64: match[2],
	}
}

const backupPhotoToPhoto = (backupPhoto: BackupPhoto): Photo => {
	const { mimeType, base64 } = parseDataUrl(backupPhoto.dataUrl)
	return {
		id: backupPhoto.id,
		mimeType: backupPhoto.mimeType || mimeType,
		createdAt: backupPhoto.createdAt,
		blob: new Blob([base64ToArrayBuffer(base64)], { type: backupPhoto.mimeType || mimeType }),
	}
}

export const exportBackupData = async (db: PetBreederCardsDb): Promise<BackupPayloadV1> => {
	if (!db.isOpen()) {
		await db.open()
	}

	const [profiles, pets, photos, inventoryItems, storeItems, wallets, transactionLogs, breedingEvents] = await Promise.all([
		db.profiles.toArray(),
		db.pets.toArray(),
		db.photos.toArray(),
		db.inventoryItems.toArray(),
		db.storeItems.toArray(),
		db.wallets.toArray(),
		db.transactionLogs.toArray(),
		db.breedingEvents.toArray(),
	])

	return {
		schemaVersion: 1,
		exportedAt: new Date().toISOString(),
		data: {
			profiles,
			pets,
			photos: await Promise.all(photos.map((photo) => photoToBackupPhoto(photo))),
			inventoryItems,
			storeItems,
			wallets,
			transactionLogs,
			breedingEvents,
		},
	}
}

export const parseBackupPayload = (input: unknown): BackupPayloadV1 => {
	if (!isRecord(input)) {
		throw new Error('Backup file must be a JSON object.')
	}

	if (input.schemaVersion !== 1) {
		throw new Error('Unsupported backup schema version.')
	}

	if (!isRecord(input.data)) {
		throw new Error('Backup file is missing data payload.')
	}

	return {
		schemaVersion: 1,
		exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
		data: {
			profiles: assertArray<Profile>(input.data.profiles, 'profiles'),
			pets: assertArray<Pet>(input.data.pets, 'pets'),
			photos: assertArray<BackupPhoto>(input.data.photos, 'photos'),
			inventoryItems: assertArray<InventoryItem>(input.data.inventoryItems, 'inventoryItems'),
			storeItems: assertArray<StoreItem>(input.data.storeItems, 'storeItems'),
			wallets: assertArray<Wallet>(input.data.wallets, 'wallets'),
			transactionLogs: assertArray<TransactionLog>(input.data.transactionLogs, 'transactionLogs'),
			breedingEvents: assertArray<BreedingEvent>(input.data.breedingEvents, 'breedingEvents'),
		},
	}
}

export const importBackupData = async (db: PetBreederCardsDb, payload: BackupPayloadV1): Promise<void> => {
	if (!db.isOpen()) {
		await db.open()
	}

	const normalized = parseBackupPayload(payload)
	const photos = normalized.data.photos.map((photo) => backupPhotoToPhoto(photo))

	await db.transaction(
		'rw',
		[
			db.profiles,
			db.pets,
			db.photos,
			db.inventoryItems,
			db.storeItems,
			db.wallets,
			db.transactionLogs,
			db.breedingEvents,
		],
		async () => {
			await db.breedingEvents.clear()
			await db.transactionLogs.clear()
			await db.inventoryItems.clear()
			await db.pets.clear()
			await db.wallets.clear()
			await db.profiles.clear()
			await db.storeItems.clear()
			await db.photos.clear()

			await db.profiles.bulkPut(normalized.data.profiles)
			await db.pets.bulkPut(normalized.data.pets)
			await db.photos.bulkPut(photos)
			await db.inventoryItems.bulkPut(normalized.data.inventoryItems)
			await db.storeItems.bulkPut(normalized.data.storeItems)
			await db.wallets.bulkPut(normalized.data.wallets)
			await db.transactionLogs.bulkPut(normalized.data.transactionLogs)
			await db.breedingEvents.bulkPut(normalized.data.breedingEvents)
		},
	)
}
