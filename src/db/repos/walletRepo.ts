import type { Wallet } from '../../models'
import { nowIso } from '../../utils'
import type { PetBreederCardsDb } from '../database'

export type EnsureWalletInput = {
	profileId: string
	petCoins?: number
	coins?: number
}

export type AdjustWalletInput = {
	profileId: string
	deltaPetCoins: number
	deltaCoins: number
}

export class WalletRepo {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	async getByProfileId(profileId: string): Promise<Wallet | undefined> {
		return await this.db.wallets.get(profileId)
	}

	async ensureForProfile(input: EnsureWalletInput): Promise<Wallet> {
		const existing = await this.getByProfileId(input.profileId)
		if (existing) {
			return existing
		}

		const wallet: Wallet = {
			profileId: input.profileId,
			petCoins: input.petCoins ?? 0,
			coins: input.coins ?? 0,
			updatedAt: nowIso(),
		}
		await this.db.wallets.add(wallet)
		return wallet
	}

	async adjust(input: AdjustWalletInput): Promise<Wallet> {
		const existing = await this.ensureForProfile({ profileId: input.profileId })
		const wallet: Wallet = {
			...existing,
			petCoins: existing.petCoins + input.deltaPetCoins,
			coins: existing.coins + input.deltaCoins,
			updatedAt: nowIso(),
		}
		await this.db.wallets.put(wallet)
		return wallet
	}
}
