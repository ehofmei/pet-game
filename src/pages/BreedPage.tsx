import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ImageInfoCard } from '../components/ImageInfoCard'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import { EXTRA_BREED_CARD_ITEM_ID } from '../db/constants'
import { appDb, BreedingError, BreedingService, EconomyService, InventoryRepo, PetRepo, PhotoRepo } from '../db'
import type { Pet, Wallet } from '../models'
import { logAppError, setPetsEditIntent } from '../utils'

type SpeciesFilter = 'all' | Pet['species']

type BreedingSuccessState = {
	babies: Array<{
		id: string
		name: string
		species: Pet['species']
	}>
	parentAName: string
	parentBName: string
	childCount: number
	totalCoinsCost: number
	specialBreedApplied: boolean
	extraBreedCardUsed: boolean
}

const CHILD_COST_COINS = 10
const SPECIAL_BREED_EXTRA_COINS = 5

const petRepo = new PetRepo(appDb)
const photoRepo = new PhotoRepo(appDb)
const economyService = new EconomyService(appDb)
const inventoryRepo = new InventoryRepo(appDb)
const breedingService = new BreedingService(appDb)

const parseThemeTags = (value: string): string[] =>
	Array.from(
		new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	)

const pluralizeChildren = (count: number): string => (count === 1 ? 'child' : 'children')

export const BreedPage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [pets, setPets] = useState<Pet[]>([])
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
	const [wallet, setWallet] = useState<Wallet | null>(null)
	const [parentAId, setParentAId] = useState('')
	const [parentBId, setParentBId] = useState('')
	const [selectionTarget, setSelectionTarget] = useState<'A' | 'B'>('A')
	const [searchText, setSearchText] = useState('')
	const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all')
	const [allowCrossSpecies, setAllowCrossSpecies] = useState(true)
	const [childCount, setChildCount] = useState<number>(1)
	const [specialBreedSelected, setSpecialBreedSelected] = useState(false)
	const [useExtraBreedCard, setUseExtraBreedCard] = useState(false)
	const [extraBreedCardQuantity, setExtraBreedCardQuantity] = useState(0)
	const [themeTagsText, setThemeTagsText] = useState('')
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isBreeding, setIsBreeding] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [successState, setSuccessState] = useState<BreedingSuccessState | null>(null)

	const loadData = useCallback(async () => {
		if (!activeProfileId) {
			setPets([])
			setWallet(null)
			setExtraBreedCardQuantity(0)
			return
		}

		setIsLoadingData(true)
		try {
			const [profilePets, profileWallet] = await Promise.all([
				petRepo.listByProfile(activeProfileId),
				economyService.getWallet(activeProfileId),
			])
			const extraBreedCardInventory = await inventoryRepo.getByProfileAndItem(activeProfileId, EXTRA_BREED_CARD_ITEM_ID)

			setPets(profilePets)
			setWallet(profileWallet)
			setExtraBreedCardQuantity(extraBreedCardInventory?.quantity ?? 0)
			setErrorMessage(null)
		} catch (error: unknown) {
			logAppError('BreedPage.loadData', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
				},
			})
			setErrorMessage('Failed to load breeding data.')
		} finally {
			setIsLoadingData(false)
		}
	}, [activeProfileId])

	useEffect(() => {
		setStatusMessage(null)
		setErrorMessage(null)
		setSuccessState(null)
		setParentAId('')
		setParentBId('')
		setSelectionTarget('A')
		setChildCount(1)
		setSpecialBreedSelected(false)
		setUseExtraBreedCard(false)
		setThemeTagsText('')
		void loadData()
	}, [activeProfileId, loadData])

	useEffect(() => {
		if (parentAId && !pets.some((pet) => pet.id === parentAId)) {
			setParentAId('')
		}
		if (parentBId && !pets.some((pet) => pet.id === parentBId)) {
			setParentBId('')
		}
	}, [pets, parentAId, parentBId])

	useEffect(() => {
		let cancelled = false

		const loadPhotoUrls = async () => {
			const photoIds = [...new Set(pets.map((pet) => pet.photoId).filter((photoId): photoId is string => !!photoId))]
			const nextUrls: Record<string, string> = {}

			for (const photoId of photoIds) {
				const photo = await photoRepo.getById(photoId)
				if (!photo) {
					continue
				}
				try {
					nextUrls[photoId] = URL.createObjectURL(photo.blob)
				} catch {
					// Keep rendering stable for test environments that don't fully support Blob URL creation.
				}
			}

			if (cancelled) {
				for (const url of Object.values(nextUrls)) {
					URL.revokeObjectURL(url)
				}
				return
			}

			setPhotoUrls(nextUrls)
		}

		void loadPhotoUrls()

		return () => {
			cancelled = true
		}
	}, [pets])

	useEffect(() => {
		return () => {
			for (const url of Object.values(photoUrls)) {
				URL.revokeObjectURL(url)
			}
		}
	}, [photoUrls])

	const filteredPets = useMemo(() => {
		const loweredSearch = searchText.trim().toLowerCase()
		return pets.filter((pet) => {
			if (speciesFilter !== 'all' && pet.species !== speciesFilter) {
				return false
			}
			if (!loweredSearch) {
				return true
			}
			return [pet.name, pet.species, pet.tags.join(' ')].join(' ').toLowerCase().includes(loweredSearch)
		})
	}, [pets, searchText, speciesFilter])

	const parentA = useMemo(() => pets.find((pet) => pet.id === parentAId) ?? null, [pets, parentAId])
	const parentB = useMemo(() => pets.find((pet) => pet.id === parentBId) ?? null, [pets, parentBId])

	const themeTags = useMemo(() => parseThemeTags(themeTagsText), [themeTagsText])
	const sameGenderNeedsSpecial = useMemo(() => {
		if (!parentA || !parentB) {
			return false
		}
		return (
			(parentA.gender === 'male' && parentB.gender === 'male') ||
			(parentA.gender === 'female' && parentB.gender === 'female')
		)
	}, [parentA, parentB])
	const specialBreedApplied = specialBreedSelected || sameGenderNeedsSpecial || themeTags.length > 0
	const extraBreedCardRequired = useMemo(() => {
		if (!parentA || !parentB) {
			return false
		}
		return parentA.breedCount >= 5 || parentB.breedCount >= 5
	}, [parentA, parentB])
	const estimatedCost = childCount * CHILD_COST_COINS + (specialBreedApplied ? SPECIAL_BREED_EXTRA_COINS : 0)
	const hasEnoughCoins = (wallet?.coins ?? 0) >= estimatedCost
	const hasRequiredExtraBreedCard = !extraBreedCardRequired || (useExtraBreedCard && extraBreedCardQuantity > 0)

	const canSubmitBreed =
		!!activeProfileId &&
		!!parentA &&
		!!parentB &&
		parentA.id !== parentB.id &&
		!isBreeding &&
		hasEnoughCoins &&
		hasRequiredExtraBreedCard

	const selectParentFromGallery = (petId: string) => {
		if (selectionTarget === 'A') {
			setParentAId(petId)
			if (petId === parentBId) {
				setParentBId('')
			}
			setSelectionTarget('B')
			return
		}

		setParentBId(petId)
		if (petId === parentAId) {
			setParentAId('')
		}
		setSelectionTarget('A')
	}

	const clearParentSelection = (target: 'A' | 'B') => {
		if (target === 'A') {
			setParentAId('')
			setSelectionTarget('A')
			return
		}
		setParentBId('')
		setSelectionTarget('B')
	}

	const handleBreed = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!activeProfileId || !parentA || !parentB) {
			return
		}

		if (parentA.id === parentB.id) {
			setErrorMessage('Parent A and Parent B must be different pets.')
			setStatusMessage(null)
			return
		}

		setIsBreeding(true)
		try {
			const result = await breedingService.runBreeding({
				profileId: activeProfileId,
				parentAId: parentA.id,
				parentBId: parentB.id,
				allowCrossSpecies,
				childCount,
				specialBreedRequested: specialBreedSelected,
				themeTags,
				useExtraBreedCard,
			})
			setWallet(result.wallet)
			setSuccessState({
				babies: result.babyPets.map((babyPet) => ({
					id: babyPet.id,
					name: babyPet.name,
					species: babyPet.species,
				})),
				parentAName: result.parentA.name,
				parentBName: result.parentB.name,
				childCount: result.childCount,
				totalCoinsCost: result.totalCoinsCost,
				specialBreedApplied: result.specialBreedApplied,
				extraBreedCardUsed: result.extraBreedCardUsed,
			})
			setStatusMessage(`Breeding complete. ${result.childCount} ${pluralizeChildren(result.childCount)} added to Pets.`)
			setErrorMessage(null)
			await loadData()
		} catch (error: unknown) {
			if (error instanceof BreedingError) {
				setErrorMessage(error.message)
			} else {
				logAppError('BreedPage.handleBreed', error, {
					metadata: {
						activeProfileId: activeProfileId ?? 'none',
						parentAId: parentA.id,
						parentBId: parentB.id,
					},
				})
				setErrorMessage('Failed to complete breeding.')
			}
			setStatusMessage(null)
			setSuccessState(null)
		} finally {
			setIsBreeding(false)
		}
	}

	const handleAddBabyPhotoNow = (babyPetId: string) => {
		setPetsEditIntent(babyPetId)
		window.location.hash = '/pets'
	}

	if (isLoading) {
		return (
			<section className="panel">
				<h2>Breed</h2>
				<p>Loading profile context...</p>
			</section>
		)
	}

	if (!activeProfileId) {
		return (
			<section className="panel">
				<h2>Breed</h2>
				<p>Create or select a profile before breeding pets.</p>
			</section>
		)
	}

	return (
		<section className="panel">
			<h2>Breed</h2>
			<p>Profile: {activeProfile?.name ?? 'Unknown profile'}</p>

			<div className="wallet-balance-card">
				<p>
					<strong>PetCoins:</strong> {wallet?.petCoins ?? 0}
				</p>
				<p>
					<strong>Coins:</strong> {wallet?.coins ?? 0}
				</p>
			</div>
			<p className="breed-helper-text">Breeding Cards rule: each child costs 10 Coins.</p>

			<div className="breed-filter-grid">
				<label className="breed-field">
					<span>Search Pets</span>
					<input
						type="text"
						value={searchText}
						onChange={(event) => setSearchText(event.target.value)}
						placeholder="name or tag"
						aria-label="Breed pet search"
					/>
				</label>
				<label className="breed-field">
					<span>Species Filter</span>
					<select
						value={speciesFilter}
						onChange={(event) => setSpeciesFilter(event.target.value as SpeciesFilter)}
						aria-label="Breed species filter"
					>
						<option value="all">All</option>
						<option value="cat">Cat</option>
						<option value="dog">Dog</option>
						<option value="bird">Bird</option>
						<option value="bunny">Bunny</option>
						<option value="other">Other</option>
						<option value="mixed">Mixed</option>
					</select>
				</label>
			</div>

			<form className="breed-form" onSubmit={handleBreed}>
				<div className="breed-selection-tabs" role="group" aria-label="Select parent target">
					<button
						type="button"
						className={`breed-selection-tab${selectionTarget === 'A' ? ' is-active' : ''}`}
						onClick={() => setSelectionTarget('A')}
						aria-pressed={selectionTarget === 'A'}
					>
						Picking: Parent A
					</button>
					<button
						type="button"
						className={`breed-selection-tab${selectionTarget === 'B' ? ' is-active' : ''}`}
						onClick={() => setSelectionTarget('B')}
						aria-pressed={selectionTarget === 'B'}
					>
						Picking: Parent B
					</button>
				</div>

				<div className="breed-selected-grid">
					<div className={`breed-selected-card${selectionTarget === 'A' ? ' is-target' : ''}`}>
						<p className="breed-selected-title">Parent A</p>
						{parentA ? (
							<>
								<div className="breed-selected-photo">
									{parentA.photoId && photoUrls[parentA.photoId] ? (
										<img src={photoUrls[parentA.photoId]} alt={`${parentA.name} card`} />
									) : (
										<span>No Photo</span>
									)}
								</div>
								<p className="breed-selected-name">{parentA.name}</p>
								<p className="breed-selected-meta">
									{parentA.species} | {parentA.gender}
								</p>
								<button type="button" onClick={() => clearParentSelection('A')}>
									Clear Parent A
								</button>
							</>
						) : (
							<p className="breed-selected-empty">Tap a pet card below to choose Parent A.</p>
						)}
					</div>

					<div className={`breed-selected-card${selectionTarget === 'B' ? ' is-target' : ''}`}>
						<p className="breed-selected-title">Parent B</p>
						{parentB ? (
							<>
								<div className="breed-selected-photo">
									{parentB.photoId && photoUrls[parentB.photoId] ? (
										<img src={photoUrls[parentB.photoId]} alt={`${parentB.name} card`} />
									) : (
										<span>No Photo</span>
									)}
								</div>
								<p className="breed-selected-name">{parentB.name}</p>
								<p className="breed-selected-meta">
									{parentB.species} | {parentB.gender}
								</p>
								<button type="button" onClick={() => clearParentSelection('B')}>
									Clear Parent B
								</button>
							</>
						) : (
							<p className="breed-selected-empty">Tap a pet card below to choose Parent B.</p>
						)}
					</div>
				</div>

				<div className="breed-form-grid">
					<label className="breed-field">
						<span>Children</span>
						<select
							value={childCount}
							onChange={(event) => setChildCount(Number.parseInt(event.target.value, 10) || 1)}
							aria-label="Child count"
						>
							<option value={1}>1</option>
							<option value={2}>2</option>
							<option value={3}>3</option>
						</select>
					</label>

					<label className="breed-field breed-field-toggle">
						<input
							type="checkbox"
							checked={specialBreedApplied}
							disabled={sameGenderNeedsSpecial}
							onChange={(event) => setSpecialBreedSelected(event.target.checked)}
							aria-label="Special Breed"
						/>
						<span>Special Breed (+5 Coins)</span>
					</label>

					<label className="breed-field">
						<span>Theme Tags (optional)</span>
						<input
							type="text"
							value={themeTagsText}
							onChange={(event) => setThemeTagsText(event.target.value)}
							placeholder="grass, hearts"
							aria-label="Theme tags"
						/>
					</label>
				</div>

				<label className="breed-field breed-field-toggle">
					<input
						type="checkbox"
						checked={useExtraBreedCard}
						onChange={(event) => setUseExtraBreedCard(event.target.checked)}
						aria-label="Use Extra Breed Card"
					/>
					<span>Use Extra Breed Card</span>
				</label>
				<p className="breed-helper-text">Extra Breed Cards available: {extraBreedCardQuantity}</p>
				{extraBreedCardRequired ? (
					<p className="breed-helper-text">
						This pair needs an Extra Breed Card because one parent has bred 5 or more times.
					</p>
				) : (
					<p className="breed-helper-text">Extra Breed Card is only required once a parent reaches 5+ breeds.</p>
				)}
				{extraBreedCardRequired && !useExtraBreedCard ? (
					<p className="store-error">Please confirm you will use an Extra Breed Card for this breeding.</p>
				) : null}
				{extraBreedCardRequired && extraBreedCardQuantity <= 0 ? (
					<p className="store-error">No Extra Breed Cards in inventory. Buy one from Store first.</p>
				) : null}

				<p className="breed-helper-text">Estimated cost: {estimatedCost} Coins</p>
				{sameGenderNeedsSpecial ? (
					<p className="breed-helper-text">Special Breed is required for two male or two female parents.</p>
				) : null}
				{themeTags.length > 0 ? (
					<p className="breed-helper-text">Theme tags automatically apply Special Breed (+5 Coins).</p>
				) : null}
				{!hasEnoughCoins ? <p className="store-error">Not enough coins for this breeding setup.</p> : null}

				<label className="breed-field breed-field-toggle">
					<input
						type="checkbox"
						checked={allowCrossSpecies}
						onChange={(event) => setAllowCrossSpecies(event.target.checked)}
						aria-label="Allow cross-species breeding"
					/>
					<span>Allow cross-species breeding</span>
				</label>

				<button type="submit" disabled={!canSubmitBreed}>
					{isBreeding ? 'Breeding...' : 'Breed Pets'}
				</button>
			</form>

			<p className="breed-helper-text">
				{isLoadingData ? 'Loading pets...' : `Showing ${filteredPets.length} of ${pets.length} pets for selection`}
			</p>
			{filteredPets.length > 0 ? (
				<ul className="breed-gallery">
					{filteredPets.map((pet) => {
						const photoUrl = pet.photoId ? photoUrls[pet.photoId] : null
						const isParentA = pet.id === parentAId
						const isParentB = pet.id === parentBId
						return (
							<li className="breed-pet-item" key={pet.id}>
								<button
									type="button"
									className={`breed-pet-card${isParentA || isParentB ? ' is-selected' : ''}`}
									onClick={() => selectParentFromGallery(pet.id)}
									aria-label={`Select ${pet.name}`}
								>
									<ImageInfoCard
										title={pet.name}
										subtitle={`${pet.species} | ${pet.gender}`}
										imageUrl={photoUrl}
										imageAlt={`${pet.name} card`}
										badges={[
											...(isParentA ? [{ label: 'Parent A' }] : []),
											...(isParentB ? [{ label: 'Parent B', tone: 'secondary' as const }] : []),
										]}
										content={
											<>
												<p>Breed Count: {pet.breedCount}</p>
												<TagList tags={pet.tags} emptyLabel="No tags" />
											</>
										}
									/>
								</button>
							</li>
						)
					})}
				</ul>
			) : null}
			{!isLoadingData && filteredPets.length === 0 ? (
				<p className="breed-helper-text">No pets match your current filters.</p>
			) : null}
			{statusMessage ? <p className="store-status">{statusMessage}</p> : null}
			{errorMessage ? <p className="store-error">{errorMessage}</p> : null}

			{successState ? (
				<section className="breed-success">
					<h3>Breeding Success</h3>
					<p>
						<strong>Parents:</strong> {successState.parentAName} + {successState.parentBName}
					</p>
					<p>
						<strong>Children:</strong> {successState.childCount}
					</p>
					<p>
						<strong>Special Breed:</strong> {successState.specialBreedApplied ? 'Yes' : 'No'}
					</p>
					<p>
						<strong>Extra Breed Card Used:</strong> {successState.extraBreedCardUsed ? 'Yes' : 'No'}
					</p>
					<p>
						<strong>Total Cost:</strong> {successState.totalCoinsCost} Coins
					</p>
					<ul className="breed-success-list">
						{successState.babies.map((baby) => (
							<li key={baby.id}>
								<p>
									{baby.name} ({baby.species})
								</p>
								<button type="button" onClick={() => handleAddBabyPhotoNow(baby.id)}>
									Add Photo for {baby.name}
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</section>
	)
}
