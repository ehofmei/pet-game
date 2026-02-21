import { createId } from './ids'
import { nowIso } from './time'

const ERROR_LOG_STORAGE_KEY = 'pet-breeder-cards.error-log'
const ERROR_LOG_UPDATED_EVENT = 'pet-breeder-cards:error-log-updated'
const MAX_STORED_ERRORS = 50
const MAX_FIELD_LENGTH = 1500

export type AppErrorSource = 'caught' | 'unhandledError' | 'unhandledRejection'

export type AppErrorMetadataValue = string | number | boolean | null
export type AppErrorMetadata = Record<string, AppErrorMetadataValue>

export type AppErrorLogEntry = {
	id: string
	timestamp: string
	source: AppErrorSource
	context: string
	errorName: string | null
	message: string
	stack: string | null
	metadata: AppErrorMetadata
}

const truncate = (value: string, maxLength = MAX_FIELD_LENGTH): string => {
	if (value.length <= maxLength) {
		return value
	}
	return `${value.slice(0, maxLength)}...`
}

const sanitizeMetadata = (metadata?: AppErrorMetadata): AppErrorMetadata => {
	if (!metadata) {
		return {}
	}

	const next: AppErrorMetadata = {}
	for (const [key, value] of Object.entries(metadata)) {
		if (typeof value === 'string') {
			next[key] = truncate(value)
		} else if (
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === null
		) {
			next[key] = value
		}
	}
	return next
}

const normalizeUnknownError = (
	error: unknown,
): Pick<AppErrorLogEntry, 'errorName' | 'message' | 'stack'> => {
	if (error instanceof Error) {
		return {
			errorName: error.name,
			message: truncate(error.message || 'Unknown Error'),
			stack: error.stack ? truncate(error.stack) : null,
		}
	}

	if (typeof error === 'string') {
		return {
			errorName: null,
			message: truncate(error),
			stack: null,
		}
	}

	if (error && typeof error === 'object') {
		const maybeName = 'name' in error ? String(error.name) : null
		const maybeMessage = 'message' in error ? String(error.message) : null
		return {
			errorName: maybeName ? truncate(maybeName) : null,
			message: truncate(maybeMessage || 'Unknown non-Error object'),
			stack: null,
		}
	}

	return {
		errorName: null,
		message: 'Unknown error value',
		stack: null,
	}
}

const readErrorLogFromStorage = (): AppErrorLogEntry[] => {
	if (typeof window === 'undefined') {
		return []
	}

	const raw = window.localStorage.getItem(ERROR_LOG_STORAGE_KEY)
	if (!raw) {
		return []
	}

	try {
		const parsed = JSON.parse(raw) as unknown
		if (!Array.isArray(parsed)) {
			return []
		}

		return parsed.filter((entry): entry is AppErrorLogEntry => {
			return (
				!!entry &&
				typeof entry === 'object' &&
				'id' in entry &&
				'timestamp' in entry &&
				'source' in entry &&
				'context' in entry &&
				'message' in entry
			)
		})
	} catch {
		return []
	}
}

const writeErrorLogToStorage = (entries: AppErrorLogEntry[]): void => {
	if (typeof window === 'undefined') {
		return
	}
	window.localStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED_ERRORS)))
	window.dispatchEvent(new CustomEvent(ERROR_LOG_UPDATED_EVENT))
}

export const getErrorLogUpdatedEventName = (): string => ERROR_LOG_UPDATED_EVENT

export const getRecentAppErrors = (limit = 20): AppErrorLogEntry[] => {
	const entries = readErrorLogFromStorage()
	return entries.slice(0, Math.max(0, limit))
}

export const clearAppErrors = (): void => {
	writeErrorLogToStorage([])
}

export const logAppError = (
	context: string,
	error: unknown,
	options?: {
		source?: AppErrorSource
		metadata?: AppErrorMetadata
	},
): AppErrorLogEntry => {
	const normalized = normalizeUnknownError(error)
	const entry: AppErrorLogEntry = {
		id: createId(),
		timestamp: nowIso(),
		source: options?.source ?? 'caught',
		context: truncate(context),
		errorName: normalized.errorName,
		message: normalized.message,
		stack: normalized.stack,
		metadata: sanitizeMetadata(options?.metadata),
	}

	const currentEntries = readErrorLogFromStorage()
	writeErrorLogToStorage([entry, ...currentEntries])
	return entry
}

let globalErrorHandlersRegistered = false

export const registerGlobalErrorLogging = (): void => {
	if (typeof window === 'undefined' || globalErrorHandlersRegistered) {
		return
	}

	globalErrorHandlersRegistered = true

	window.addEventListener('error', (event) => {
		logAppError('window.error', event.error ?? event.message, {
			source: 'unhandledError',
			metadata: {
				filename: event.filename || null,
				line: event.lineno,
				column: event.colno,
			},
		})
	})

	window.addEventListener('unhandledrejection', (event) => {
		logAppError('window.unhandledrejection', event.reason, {
			source: 'unhandledRejection',
		})
	})
}
