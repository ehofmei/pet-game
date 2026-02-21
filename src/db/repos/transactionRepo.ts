import type { TransactionLog, TransactionKind } from '../../models'
import { createId, nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type CreateTransactionInput = {
	profileId: string
	kind: TransactionKind
	deltaPetCoins: number
	deltaCoins: number
	notes: string
}

export class TransactionRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async listByProfile(profileId: string): Promise<TransactionLog[]> {
		return await this.db.transactionLogs.where('profileId').equals(profileId).sortBy('createdAt')
	}

	async create(input: CreateTransactionInput): Promise<TransactionLog> {
		const log: TransactionLog = {
			id: createId(),
			profileId: input.profileId,
			kind: input.kind,
			deltaPetCoins: input.deltaPetCoins,
			deltaCoins: input.deltaCoins,
			notes: input.notes.trim(),
			createdAt: nowIso(),
		}
		await this.db.transactionLogs.add(log)
		return log
	}
}
