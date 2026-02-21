import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import {
	appDb,
	BreedingError,
	BreedingService,
	EconomyService,
	InventoryRepo,
	PetRepo,
	PhotoRepo,
	StoreRepo,
} from '../db'
import type { Pet, StoreItem, Wallet } from '../models'
import { logAppError, setPetsEditIntent } from '../utils'

type SpeciesFilter = 'all' | Pet['species']

type BreedingSuccessState = {
	babyPetId: string
	babyName: string
	babySpecies: Pet['species']
	parentAName: string
	parentBName: string
	sessionItemName: string
	usedInventoryToken: boolean
}

const petRepo = new PetRepo(appDb)
const storeRepo = new StoreRepo(appDb)
const inventoryRepo = new InventoryRepo(appDb)
const photoRepo = new PhotoRepo(appDb)
const economyService = new EconomyService(appDb)
const breedingService = new BreedingService(appDb)

const isBreedingSessionStoreItem = (item: StoreItem): boolean => {
	if (!item.isActive) {
		return false
	}
	if (item.type === 'breedingSession') {
		return true
	}
	return item.tags.some((tag) => tag.trim().toLowerCase() === 'breedingsession')
}

const getCostLabel = (item: StoreItem): string => {
	const parts: string[] = []
	if (item.priceCoins > 0) {
		parts.push(`${item.priceCoins} Coins`)
	}
	if (item.pricePetCoins > 0) {
		parts.push(`${item.pricePetCoins} PetCoins`)
	}
	if (parts.length === 0) {
		return 'Free'
	}
	return parts.join(' + ')
}

const sortBySessionCost = (items: StoreItem[]): StoreItem[] =>
	[...items].sort((a, b) => {
		if (a.priceCoins !== b.priceCoins) {
			return a.priceCoins - b.priceCoins
		}
		if (a.pricePetCoins !== b.pricePetCoins) {
			return a.pricePetCoins - b.pricePetCoins
		}
		return a.id.localeCompare(b.id)
	})

export const BreedPage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [pets, setPets] = useState<Pet[]>([])
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
	const [wallet, setWallet] = useState<Wallet | null>(null)
	const [sessionItemCount, setSessionItemCount] = useState(0)
	const [fallbackSessionItem, setFallbackSessionItem] = useState<StoreItem | null>(null)
	const [parentAId, setParentAId] = useState('')
	const [parentBId, setParentBId] = useState('')
	const [selectionTarget, setSelectionTarget] = useState<'A' | 'B'>('A')
	const [searchText, setSearchText] = useState('')
	const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all')
	const [allowCrossSpecies, setAllowCrossSpecies] = useState(true)
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isBreeding, setIsBreeding] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [successState, setSuccessState] = useState<BreedingSuccessState | null>(null)

	const loadData = useCallback(async () => {
		if (!activeProfileId) {
			setPets([])
			setWallet(null)
			setSessionItemCount(0)
			setFallbackSessionItem(null)
			return
		}

		setIsLoadingData(true)
		try {
			const [profilePets, profileWallet, inventoryItems, activeStoreItems] = await Promise.all([
				petRepo.listByProfile(activeProfileId),
				economyService.getWallet(activeProfileId),
				inventoryRepo.listByProfile(activeProfileId),
				storeRepo.listActive(),
			])
			const sessionItems = sortBySessionCost(activeStoreItems.filter(isBreedingSessionStoreItem))
			const sessionItemIds = new Set(sessionItems.map((item) => item.id))
			const nextSessionItemCount = inventoryItems
				.filter((item) => sessionItemIds.has(item.itemId))
				.reduce((total, item) => total + item.quantity, 0)

			setPets(profilePets)
			setWallet(profileWallet)
			setSessionItemCount(nextSessionItemCount)
			setFallbackSessionItem(sessionItems[0] ?? null)
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

	const canSubmitBreed = !!activeProfileId && !!parentA && !!parentB && parentA.id !== parentB.id && !isBreeding

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

		let autoBuySessionIfNeeded = false
		if (sessionItemCount <= 0) {
			if (!fallbackSessionItem) {
				setErrorMessage('No breeding session item is available in Store.')
				setStatusMessage(null)
				return
			}
			const confirmed = window.confirm(
				`No breeding tokens in inventory. Buy and use "${fallbackSessionItem.name}" for ${getCostLabel(fallbackSessionItem)}?`,
			)
			if (!confirmed) {
				return
			}
			autoBuySessionIfNeeded = true
		}

		setIsBreeding(true)
		try {
			const result = await breedingService.runBreeding({
				profileId: activeProfileId,
				parentAId: parentA.id,
				parentBId: parentB.id,
				allowCrossSpecies,
				autoBuySessionIfNeeded,
			})
			setWallet(result.wallet)
			setSuccessState({
				babyPetId: result.babyPet.id,
				babyName: result.babyPet.name,
				babySpecies: result.babyPet.species,
				parentAName: result.parentA.name,
				parentBName: result.parentB.name,
				sessionItemName: result.breedingSessionStoreItem.name,
				usedInventoryToken: result.usedBreedingSessionItem,
			})
			setStatusMessage(`Breeding complete. ${result.babyPet.name} was added to Pets.`)
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

	const handleAddBabyPhotoNow = () => {
		if (!successState) {
			return
		}
		setPetsEditIntent(successState.babyPetId)
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
				<p>
					<strong>Breeding Tokens:</strong> {sessionItemCount}
				</p>
			</div>
			{fallbackSessionItem ? (
				<p className="breed-helper-text">
					If no token is in inventory, breeding can buy and use "{fallbackSessionItem.name}" for{' '}
					{getCostLabel(fallbackSessionItem)}.
				</p>
			) : (
				<p className="breed-helper-text">No breeding session items are currently configured in Store.</p>
			)}

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
									<div className="breed-pet-photo">
										{photoUrl ? <img src={photoUrl} alt={`${pet.name} card`} /> : <span>No Photo</span>}
										{isParentA ? <span className="breed-pet-badge">Parent A</span> : null}
										{isParentB ? <span className="breed-pet-badge breed-pet-badge-b">Parent B</span> : null}
									</div>
									<div className="breed-pet-meta">
										<p className="breed-pet-name">{pet.name}</p>
										<p>
											{pet.species} | {pet.gender}
										</p>
										<p>Breed Count: {pet.breedCount}</p>
										<TagList tags={pet.tags} emptyLabel="No tags" />
									</div>
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
						<strong>Baby:</strong> {successState.babyName} ({successState.babySpecies})
					</p>
					<p>
						<strong>Parents:</strong> {successState.parentAName} + {successState.parentBName}
					</p>
					<p>
						<strong>Session Source:</strong>{' '}
						{successState.usedInventoryToken
							? `"${successState.sessionItemName}" from inventory`
							: `Bought and used "${successState.sessionItemName}"`}
					</p>
					<button type="button" onClick={handleAddBabyPhotoNow}>
						Add Baby Photo Now
					</button>
				</section>
			) : null}
		</section>
	)
}
