export type TransactionKind = 'buyPet' | 'buyItem' | 'breeding' | 'adjustment'

export type TransactionLog = {
	id: string
	profileId: string
	kind: TransactionKind
	deltaPetCoins: number
	deltaCoins: number
	notes: string
	createdAt: string
}
