import type { BreedingEvent, Pet, TransactionLog, Wallet } from '../../models'
import { createId, nowIso } from '../../utils'
import { EXTRA_BREED_CARD_ITEM_ID } from '../constants'
import type { PetBreederCardsDb } from '../database'

const CHILD_COST_COINS = 10
const SPECIAL_BREED_EXTRA_COINS = 5
const EXTRA_BREED_CARD_THRESHOLD = 5

export class BreedingError extends Error {
	code: 'NOT_FOUND' | 'INVALID_INPUT' | 'INSUFFICIENT_FUNDS' | 'MISSING_REQUIRED_ITEM'

	constructor(message: string, code: BreedingError['code']) {
		super(message)
		this.code = code
	}
}

export type RunBreedingInput = {
	profileId: string
	parentAId: string
	parentBId: string
	allowCrossSpecies: boolean
	childCount: number
	specialBreedRequested: boolean
	themeTags: string[]
	useExtraBreedCard: boolean
}

export type RunBreedingResult = {
	parentA: Pet
	parentB: Pet
	babyPets: Pet[]
	breedingEvents: BreedingEvent[]
	transactionLog: TransactionLog
	wallet: Wallet
	childCount: number
	totalCoinsCost: number
	specialBreedApplied: boolean
	extraBreedCardRequired: boolean
	extraBreedCardUsed: boolean
}

const createWalletRecord = (profileId: string): Wallet => ({
	profileId,
	petCoins: 0,
	coins: 0,
	updatedAt: nowIso(),
})

const createTransaction = ({
	profileId,
	deltaCoins,
	notes,
}: {
	profileId: string
	deltaCoins: number
	notes: string
}): TransactionLog => ({
	id: createId(),
	profileId,
	kind: 'breeding',
	deltaPetCoins: 0,
	deltaCoins: Object.is(deltaCoins, -0) ? 0 : deltaCoins,
	notes: notes.trim(),
	createdAt: nowIso(),
})

const createBreedingEvent = ({
	profileId,
	parentAId,
	parentBId,
	babyPetId,
	usedExtraBreedCard,
}: {
	profileId: string
	parentAId: string
	parentBId: string
	babyPetId: string
	usedExtraBreedCard: boolean
}): BreedingEvent => ({
	id: createId(),
	profileId,
	parentAId,
	parentBId,
	babyPetId,
	usedBreedingSessionItem: usedExtraBreedCard,
	createdAt: nowIso(),
})

const getBabySpecies = (parentA: Pet, parentB: Pet): Pet['species'] =>
	parentA.species === parentB.species ? parentA.species : 'mixed'

const normalizeThemeTags = (tags: string[]): string[] =>
	Array.from(
		new Set(
			tags
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	)

const getBabyTags = (parentA: Pet, parentB: Pet, themeTags: string[]): string[] =>
	Array.from(new Set([...parentA.tags, ...parentB.tags, ...themeTags, 'baby']))

const needsMandatorySpecialBreedForGender = (parentA: Pet, parentB: Pet): boolean =>
	(parentA.gender === 'male' && parentB.gender === 'male') ||
	(parentA.gender === 'female' && parentB.gender === 'female')

const needsExtraBreedCard = (parentA: Pet, parentB: Pet): boolean =>
	parentA.breedCount >= EXTRA_BREED_CARD_THRESHOLD || parentB.breedCount >= EXTRA_BREED_CARD_THRESHOLD

export class BreedingService {
	private readonly db: PetBreederCardsDb

	constructor(db: PetBreederCardsDb) {
		this.db = db
	}

	private async ensureWallet(profileId: string): Promise<Wallet> {
		const existing = await this.db.wallets.get(profileId)
		if (existing) {
			return existing
		}

		const wallet = createWalletRecord(profileId)
		await this.db.wallets.add(wallet)
		return wallet
	}

	private async getParentPet(profileId: string, petId: string, label: 'A' | 'B'): Promise<Pet> {
		const pet = await this.db.pets.get(petId)
		if (!pet || pet.profileId !== profileId) {
			throw new BreedingError(`Parent ${label} was not found in this profile.`, 'NOT_FOUND')
		}
		return pet
	}

	async runBreeding(input: RunBreedingInput): Promise<RunBreedingResult> {
		if (input.parentAId === input.parentBId) {
			throw new BreedingError('Parent A and Parent B must be different pets.', 'INVALID_INPUT')
		}
		if (!Number.isInteger(input.childCount) || input.childCount < 1 || input.childCount > 3) {
			throw new BreedingError('Child count must be 1, 2, or 3.', 'INVALID_INPUT')
		}

		const result = await this.db.transaction(
			'rw',
			[this.db.pets, this.db.wallets, this.db.breedingEvents, this.db.transactionLogs, this.db.inventoryItems],
			async () => {
				const parentA = await this.getParentPet(input.profileId, input.parentAId, 'A')
				const parentB = await this.getParentPet(input.profileId, input.parentBId, 'B')
				if (!input.allowCrossSpecies && parentA.species !== parentB.species) {
					throw new BreedingError('Cross-species breeding is disabled.', 'INVALID_INPUT')
				}
				const extraBreedCardRequired = needsExtraBreedCard(parentA, parentB)
				if (extraBreedCardRequired && !input.useExtraBreedCard) {
					throw new BreedingError('Extra Breed Card is required for pets with 5 or more breeds.', 'INVALID_INPUT')
				}

				const themeTags = normalizeThemeTags(input.themeTags)
				const specialBreedApplied =
					input.specialBreedRequested ||
					themeTags.length > 0 ||
					needsMandatorySpecialBreedForGender(parentA, parentB)
				let extraBreedCardUsed = false
				if (extraBreedCardRequired) {
					const extraBreedCardInventory = await this.db.inventoryItems
						.where('[profileId+itemId]')
						.equals([input.profileId, EXTRA_BREED_CARD_ITEM_ID])
						.first()
					if (!extraBreedCardInventory || extraBreedCardInventory.quantity <= 0) {
						throw new BreedingError(
							'Extra Breed Card is required. Buy one in Store before breeding this pair.',
							'MISSING_REQUIRED_ITEM',
						)
					}
					await this.db.inventoryItems.put({
						...extraBreedCardInventory,
						quantity: extraBreedCardInventory.quantity - 1,
						updatedAt: nowIso(),
					})
					extraBreedCardUsed = true
				}

				const totalCoinsCost = input.childCount * CHILD_COST_COINS + (specialBreedApplied ? SPECIAL_BREED_EXTRA_COINS : 0)

				let wallet = await this.ensureWallet(input.profileId)
				if (wallet.coins < totalCoinsCost) {
					throw new BreedingError('Not enough coins to complete this breeding.', 'INSUFFICIENT_FUNDS')
				}

				wallet = {
					...wallet,
					coins: wallet.coins - totalCoinsCost,
					updatedAt: nowIso(),
				}
				await this.db.wallets.put(wallet)

				const updatedParentA: Pet = {
					...parentA,
					breedCount: parentA.breedCount + 1,
					updatedAt: nowIso(),
				}
				const updatedParentB: Pet = {
					...parentB,
					breedCount: parentB.breedCount + 1,
					updatedAt: nowIso(),
				}
				await this.db.pets.put(updatedParentA)
				await this.db.pets.put(updatedParentB)

				const babyPets: Pet[] = []
				const breedingEvents: BreedingEvent[] = []
				for (let index = 0; index < input.childCount; index += 1) {
					const babyNumberPrefix = input.childCount > 1 ? `Baby ${index + 1} of` : 'Baby of'
					const babyPet: Pet = {
						id: createId(),
						profileId: input.profileId,
						name: `${babyNumberPrefix} ${parentA.name} + ${parentB.name}`,
						species: getBabySpecies(parentA, parentB),
						gender: 'unknown',
						wasWild: false,
						tags: getBabyTags(parentA, parentB, specialBreedApplied ? themeTags : []),
						breedCount: 0,
						photoId: null,
						notes: `Bred from ${parentA.name} + ${parentB.name}${specialBreedApplied ? ' using Special Breed' : ''}.`,
						createdAt: nowIso(),
						updatedAt: nowIso(),
					}
					await this.db.pets.add(babyPet)
					babyPets.push(babyPet)

					const event = createBreedingEvent({
						profileId: input.profileId,
						parentAId: parentA.id,
						parentBId: parentB.id,
						babyPetId: babyPet.id,
						usedExtraBreedCard: extraBreedCardUsed,
					})
					await this.db.breedingEvents.add(event)
					breedingEvents.push(event)
				}

				const transactionLog = createTransaction({
					profileId: input.profileId,
					deltaCoins: -totalCoinsCost,
					notes: `Breeding: ${parentA.name} + ${parentB.name}, children: ${input.childCount}, special: ${
						specialBreedApplied ? 'yes' : 'no'
					}, extra-card: ${extraBreedCardUsed ? 'yes' : 'no'}, cost: ${totalCoinsCost} Coins.`,
				})
				await this.db.transactionLogs.add(transactionLog)

				return {
					parentA: updatedParentA,
					parentB: updatedParentB,
					babyPets,
					breedingEvents,
					transactionLog,
					wallet,
					childCount: input.childCount,
					totalCoinsCost,
					specialBreedApplied,
					extraBreedCardRequired,
					extraBreedCardUsed,
				}
			},
		)

		return result
	}
}
