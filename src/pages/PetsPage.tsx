import { useCallback, useEffect, useMemo, useState } from 'react'
import { PetForm, type PetFormValues } from '../components/PetForm'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import { appDb, BreedingRepo, PetRepo, PhotoRepo, type CreatePetInput } from '../db'
import type { BreedingEvent, Pet, PetGender, PetSpecies } from '../models'
import { logAppError } from '../utils'

type PetsView = 'list' | 'create' | 'detail' | 'edit'
type WildFilter = 'all' | 'wild' | 'adopted'

const petRepo = new PetRepo(appDb)
const photoRepo = new PhotoRepo(appDb)
const breedingRepo = new BreedingRepo(appDb)

const parseTags = (tagsText: string): string[] => {
	return tagsText
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
}

export const PetsPage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [view, setView] = useState<PetsView>('list')
	const [pets, setPets] = useState<Pet[]>([])
	const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
	const [isLoadingPets, setIsLoadingPets] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [pageError, setPageError] = useState<string | null>(null)
	const [searchText, setSearchText] = useState('')
	const [speciesFilter, setSpeciesFilter] = useState<'all' | PetSpecies>('all')
	const [genderFilter, setGenderFilter] = useState<'all' | PetGender>('all')
	const [wildFilter, setWildFilter] = useState<WildFilter>('all')
	const [tagFilter, setTagFilter] = useState('')
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
	const [breedingHistory, setBreedingHistory] = useState<BreedingEvent[]>([])
	const [isLoadingHistory, setIsLoadingHistory] = useState(false)

	const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId])

	const petsById = useMemo(
		() =>
			pets.reduce<Record<string, Pet>>((acc, pet) => {
				acc[pet.id] = pet
				return acc
			}, {}),
		[pets],
	)

	const loadPets = useCallback(async () => {
		if (!activeProfileId) {
			setPets([])
			return
		}

		setIsLoadingPets(true)
		try {
			const nextPets = await petRepo.listByProfile(activeProfileId)
			setPets(nextPets)
			setPageError(null)
		} catch (error: unknown) {
			logAppError('PetsPage.loadPets', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
				},
			})
			setPageError('Failed to load pets.')
		} finally {
			setIsLoadingPets(false)
		}
	}, [activeProfileId])

	useEffect(() => {
		setView('list')
		setSelectedPetId(null)
		setBreedingHistory([])
		void loadPets()
	}, [activeProfileId, loadPets])

	useEffect(() => {
		let cancelled = false

		const loadPhotoUrls = async () => {
			const nextPhotoIds = [...new Set(pets.map((pet) => pet.photoId).filter((photoId): photoId is string => !!photoId))]
			const nextUrls: Record<string, string> = {}

			for (const photoId of nextPhotoIds) {
				const photo = await photoRepo.getById(photoId)
				if (!photo) {
					continue
				}
				try {
					nextUrls[photoId] = URL.createObjectURL(photo.blob)
				} catch {
					// fake-indexeddb may deserialize blob values in a non-Blob shape during tests.
					// Skip preview URL in that case and keep the app functional.
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

	useEffect(() => {
		const loadHistory = async () => {
			if (!selectedPetId || !activeProfileId || view !== 'detail') {
				setBreedingHistory([])
				return
			}

			setIsLoadingHistory(true)
			try {
				const events = await breedingRepo.listByPetId(selectedPetId)
				setBreedingHistory(events.filter((event) => event.profileId === activeProfileId))
			} catch (error: unknown) {
				logAppError('PetsPage.loadBreedingHistory', error, {
					metadata: {
						activeProfileId: activeProfileId ?? 'none',
						selectedPetId: selectedPetId ?? 'none',
					},
				})
				setPageError('Failed to load breeding history.')
				setBreedingHistory([])
			} finally {
				setIsLoadingHistory(false)
			}
		}

		void loadHistory()
	}, [selectedPetId, activeProfileId, view])

	useEffect(() => {
		if ((view === 'detail' || view === 'edit') && !selectedPetId) {
			setView('list')
		}
	}, [view, selectedPetId])

	useEffect(() => {
		if (selectedPetId && !selectedPet) {
			setSelectedPetId(null)
		}
	}, [selectedPetId, selectedPet])

	const filteredPets = useMemo(() => {
		const loweredSearch = searchText.trim().toLowerCase()
		const loweredTagFilter = tagFilter.trim().toLowerCase()

		return pets.filter((pet) => {
			if (speciesFilter !== 'all' && pet.species !== speciesFilter) {
				return false
			}
			if (genderFilter !== 'all' && pet.gender !== genderFilter) {
				return false
			}
			if (wildFilter === 'wild' && !pet.wasWild) {
				return false
			}
			if (wildFilter === 'adopted' && pet.wasWild) {
				return false
			}
			if (loweredTagFilter && !pet.tags.some((tag) => tag.toLowerCase().includes(loweredTagFilter))) {
				return false
			}
			if (!loweredSearch) {
				return true
			}

			const haystack = [pet.name, pet.species, pet.gender, pet.notes ?? '', pet.tags.join(' ')].join(' ').toLowerCase()
			return haystack.includes(loweredSearch)
		})
	}, [pets, searchText, speciesFilter, genderFilter, wildFilter, tagFilter])

	const resolvePhotoId = async (photoFile: File | null): Promise<string | null> => {
		if (!photoFile) {
			return null
		}
		const photo = await photoRepo.create({
			blob: photoFile,
			mimeType: photoFile.type || 'application/octet-stream',
		})
		return photo.id
	}

	const toPetPayload = (values: PetFormValues): Omit<CreatePetInput, 'profileId'> => ({
		name: values.name,
		species: values.species,
		gender: values.gender,
		wasWild: values.wasWild,
		tags: parseTags(values.tagsText),
		breedCount: values.breedCount,
		notes: values.notes.trim() || undefined,
	})

	const handleCreatePet = async (values: PetFormValues) => {
		if (!activeProfileId) {
			return
		}
		setIsSaving(true)
		try {
			const photoId = await resolvePhotoId(values.photoFile)
			const payload = toPetPayload(values)
			const createdPet = await petRepo.create({
				...payload,
				profileId: activeProfileId,
				photoId,
			})
			await loadPets()
			setSelectedPetId(createdPet.id)
			setView('detail')
			setPageError(null)
		} catch (error: unknown) {
			logAppError('PetsPage.handleCreatePet', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
				},
			})
			setPageError('Failed to create pet.')
		} finally {
			setIsSaving(false)
		}
	}

	const handleUpdatePet = async (values: PetFormValues) => {
		if (!selectedPet) {
			return
		}
		setIsSaving(true)
		try {
			let nextPhotoId = selectedPet.photoId
			if (values.photoFile) {
				nextPhotoId = await resolvePhotoId(values.photoFile)
			}
			const payload = toPetPayload(values)
			await petRepo.update(selectedPet.id, {
				...payload,
				photoId: nextPhotoId,
			})
			if (values.photoFile && selectedPet.photoId && selectedPet.photoId !== nextPhotoId) {
				await photoRepo.delete(selectedPet.photoId)
			}
			await loadPets()
			setView('detail')
			setPageError(null)
		} catch (error: unknown) {
			logAppError('PetsPage.handleUpdatePet', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
					selectedPetId: selectedPet?.id ?? 'none',
				},
			})
			setPageError('Failed to update pet.')
		} finally {
			setIsSaving(false)
		}
	}

	const handleDeleteSelectedPet = async () => {
		if (!selectedPet) {
			return
		}
		const confirmed = window.confirm(`Delete pet "${selectedPet.name}"?`)
		if (!confirmed) {
			return
		}

		try {
			await petRepo.delete(selectedPet.id)
			if (selectedPet.photoId) {
				await photoRepo.delete(selectedPet.photoId)
			}
			await loadPets()
			setSelectedPetId(null)
			setView('list')
			setPageError(null)
		} catch (error: unknown) {
			logAppError('PetsPage.handleDeleteSelectedPet', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
					selectedPetId: selectedPet?.id ?? 'none',
				},
			})
			setPageError('Failed to delete pet.')
		}
	}

	const adjustBreedCount = async (delta: number) => {
		if (!selectedPet) {
			return
		}
		const nextCount = Math.max(0, selectedPet.breedCount + delta)
		try {
			await petRepo.update(selectedPet.id, {
				breedCount: nextCount,
			})
			await loadPets()
		} catch (error: unknown) {
			logAppError('PetsPage.adjustBreedCount', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
					selectedPetId: selectedPet?.id ?? 'none',
					delta,
				},
			})
			setPageError('Failed to adjust breed count.')
		}
	}

	if (isLoading) {
		return (
			<section className="panel">
				<h2>Pets</h2>
				<p>Loading profile context...</p>
			</section>
		)
	}

	if (!activeProfileId) {
		return (
			<section className="panel">
				<h2>Pets</h2>
				<p>Create or select a profile before managing pets.</p>
			</section>
		)
	}

	const selectedPhotoUrl = selectedPet?.photoId ? photoUrls[selectedPet.photoId] : null

	if (view === 'create') {
		return (
			<section className="panel">
				<h2>Add Pet</h2>
				<p>Add a pet card for profile: {activeProfile?.name ?? 'Unknown profile'}</p>
				<PetForm
					mode="create"
					submitLabel="Save Pet"
					isSubmitting={isSaving}
					onCancel={() => setView('list')}
					onSubmit={handleCreatePet}
				/>
				{pageError ? <p className="pets-error">{pageError}</p> : null}
			</section>
		)
	}

	if (view === 'edit' && selectedPet) {
		return (
			<section className="panel">
				<h2>Edit Pet</h2>
				<PetForm
					mode="edit"
					initialValues={{
						name: selectedPet.name,
						species: selectedPet.species,
						gender: selectedPet.gender,
						wasWild: selectedPet.wasWild,
						tagsText: selectedPet.tags.join(', '),
						breedCount: selectedPet.breedCount,
						notes: selectedPet.notes ?? '',
					}}
					existingPhotoUrl={selectedPhotoUrl}
					submitLabel="Save Changes"
					isSubmitting={isSaving}
					onCancel={() => setView('detail')}
					onSubmit={handleUpdatePet}
				/>
				{pageError ? <p className="pets-error">{pageError}</p> : null}
			</section>
		)
	}

	if (view === 'detail' && selectedPet) {
		return (
			<section className="panel">
				<div className="pets-detail-header">
					<h2>{selectedPet.name}</h2>
					<div className="pets-detail-actions">
						<button type="button" onClick={() => setView('list')}>
							Back to Pets
						</button>
						<button type="button" onClick={() => setView('edit')}>
							Edit Pet
						</button>
						<button type="button" onClick={handleDeleteSelectedPet}>
							Delete Pet
						</button>
					</div>
				</div>

				{selectedPhotoUrl ? (
					<div className="pets-detail-photo">
						<img src={selectedPhotoUrl} alt={`${selectedPet.name} full`} />
					</div>
				) : (
					<p className="pets-photo-placeholder">No photo yet for this pet.</p>
				)}

				<div className="pets-detail-grid">
					<p>
						<strong>Species:</strong> {selectedPet.species}
					</p>
					<p>
						<strong>Gender:</strong> {selectedPet.gender}
					</p>
					<p>
						<strong>Was Wild:</strong> {selectedPet.wasWild ? 'Yes' : 'No'}
					</p>
					<p>
						<strong>Tags:</strong>
					</p>
					<TagList tags={selectedPet.tags} emptyLabel="No tags" />
				</div>

				<div className="pets-breed-count-row">
					<p>
						<strong>Breed Count:</strong> {selectedPet.breedCount}
					</p>
					<div className="pets-breed-controls">
						<button type="button" onClick={() => adjustBreedCount(-1)}>
							-1
						</button>
						<button type="button" onClick={() => adjustBreedCount(1)}>
							+1
						</button>
					</div>
				</div>

				{selectedPet.notes ? (
					<p>
						<strong>Notes:</strong> {selectedPet.notes}
					</p>
				) : null}

				<section className="pets-history">
					<h3>Breeding History</h3>
					{isLoadingHistory ? <p>Loading breeding history...</p> : null}
					{!isLoadingHistory && breedingHistory.length === 0 ? <p>No breeding history yet.</p> : null}
					{!isLoadingHistory && breedingHistory.length > 0 ? (
						<ul className="pets-history-list">
							{breedingHistory.map((event) => {
								const parentA = petsById[event.parentAId]?.name ?? 'Unknown Parent A'
								const parentB = petsById[event.parentBId]?.name ?? 'Unknown Parent B'
								const baby = petsById[event.babyPetId]?.name ?? 'Unknown Baby'
								return (
									<li key={event.id}>
										<span>{new Date(event.createdAt).toLocaleString()}:</span> {parentA} + {parentB} -{'>'} {baby}
									</li>
								)
							})}
						</ul>
					) : null}
				</section>

				{pageError ? <p className="pets-error">{pageError}</p> : null}
			</section>
		)
	}

	return (
		<section className="panel">
			<div className="pets-header-row">
				<h2>Pets</h2>
				<button type="button" onClick={() => setView('create')}>
					Add Pet
				</button>
			</div>
			<p>Showing pets for profile: {activeProfile?.name ?? 'No active profile selected'}</p>

			<div className="pets-filter-grid">
				<label className="pets-field">
					<span>Search</span>
					<input
						value={searchText}
						onChange={(event) => setSearchText(event.target.value)}
						placeholder="Search name/tags"
						aria-label="Search pets"
					/>
				</label>
				<label className="pets-field">
					<span>Species</span>
					<select
						value={speciesFilter}
						onChange={(event) => setSpeciesFilter(event.target.value as 'all' | PetSpecies)}
						aria-label="Filter species"
					>
						<option value="all">all</option>
						<option value="cat">cat</option>
						<option value="dog">dog</option>
						<option value="bird">bird</option>
						<option value="bunny">bunny</option>
						<option value="other">other</option>
						<option value="mixed">mixed</option>
					</select>
				</label>
				<label className="pets-field">
					<span>Gender</span>
					<select
						value={genderFilter}
						onChange={(event) => setGenderFilter(event.target.value as 'all' | PetGender)}
						aria-label="Filter gender"
					>
						<option value="all">all</option>
						<option value="female">female</option>
						<option value="male">male</option>
						<option value="unknown">unknown</option>
					</select>
				</label>
				<label className="pets-field">
					<span>Wild Status</span>
					<select
						value={wildFilter}
						onChange={(event) => setWildFilter(event.target.value as WildFilter)}
						aria-label="Filter wild status"
					>
						<option value="all">all</option>
						<option value="wild">was wild</option>
						<option value="adopted">not wild</option>
					</select>
				</label>
				<label className="pets-field">
					<span>Tag Filter</span>
					<input
						value={tagFilter}
						onChange={(event) => setTagFilter(event.target.value)}
						placeholder="tag contains"
						aria-label="Filter tag"
					/>
				</label>
			</div>

			<p className="pets-result-count">
				{isLoadingPets ? 'Loading pets...' : `Showing ${filteredPets.length} of ${pets.length} pets`}
			</p>
			{pageError ? <p className="pets-error">{pageError}</p> : null}

			{!isLoadingPets && filteredPets.length === 0 ? <p>No pets match current filters.</p> : null}
			{filteredPets.length > 0 ? (
				<ul className="pets-list">
					{filteredPets.map((pet) => {
						const petPhotoUrl = pet.photoId ? photoUrls[pet.photoId] : null
						return (
							<li className="pets-item" key={pet.id}>
								<div className="pets-thumb">
									{petPhotoUrl ? <img src={petPhotoUrl} alt={`${pet.name} thumbnail`} /> : <span>No Photo</span>}
								</div>
								<div className="pets-item-meta">
									<h3>{pet.name}</h3>
									<p>
										{pet.species} | {pet.gender}
									</p>
									<p>Breed Count: {pet.breedCount}</p>
									<p>{pet.wasWild ? 'Was wild before adopted' : 'Raised from card start'}</p>
									<div>
										<p>Tags:</p>
										<TagList tags={pet.tags} emptyLabel="No tags" />
									</div>
								</div>
								<div className="pets-item-actions">
									<button
										type="button"
										onClick={() => {
											setSelectedPetId(pet.id)
											setView('detail')
										}}
										aria-label={`View Details ${pet.name}`}
									>
										View Details
									</button>
								</div>
							</li>
						)
					})}
				</ul>
			) : null}
		</section>
	)
}
