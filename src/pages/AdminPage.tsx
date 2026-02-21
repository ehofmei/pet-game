import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import { appDb, EconomyError, EconomyService, PhotoRepo, StoreRepo } from '../db'
import type { StoreItem, StoreItemType, Wallet } from '../models'
import {
	clearAppErrors,
	getErrorLogUpdatedEventName,
	getRecentAppErrors,
	logAppError,
	type AppErrorLogEntry,
} from '../utils'

type StoreKind = 'pet' | 'item'
type SpeciesChoice = NonNullable<StoreItem['speciesRestriction']> | 'none'

const economyService = new EconomyService(appDb)
const photoRepo = new PhotoRepo(appDb)
const storeRepo = new StoreRepo(appDb)

const parseTags = (tagsText: string): string[] => {
	return tagsText
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
}

const toDisplayType = (type: StoreItemType): StoreKind => (type === 'pet' ? 'pet' : 'item')

const toStoreType = (kind: StoreKind): StoreItemType => (kind === 'pet' ? 'pet' : 'supply')

const getCostText = (item: StoreItem): string => {
	if (item.type === 'pet') {
		return `${item.pricePetCoins} PetCoins`
	}
	return `${item.priceCoins} Coins`
}

export const AdminPage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [wallet, setWallet] = useState<Wallet | null>(null)
	const [walletPetCoinsChange, setWalletPetCoinsChange] = useState('0')
	const [walletCoinsChange, setWalletCoinsChange] = useState('0')
	const [walletNote, setWalletNote] = useState('')

	const [storeItems, setStoreItems] = useState<StoreItem[]>([])
	const [editingStoreItemId, setEditingStoreItemId] = useState<string | null>(null)
	const [storeItemKind, setStoreItemKind] = useState<StoreKind>('pet')
	const [storeItemName, setStoreItemName] = useState('')
	const [storeItemDescription, setStoreItemDescription] = useState('')
	const [storeItemSpecies, setStoreItemSpecies] = useState<SpeciesChoice>('cat')
	const [storeItemPrice, setStoreItemPrice] = useState('0')
	const [storeItemTags, setStoreItemTags] = useState('')
	const [storeItemIsActive, setStoreItemIsActive] = useState(true)
	const [storeItemPhotoFile, setStoreItemPhotoFile] = useState<File | null>(null)
	const [storeItemPhotoInputKey, setStoreItemPhotoInputKey] = useState(0)
	const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null)

	const [recentErrors, setRecentErrors] = useState<AppErrorLogEntry[]>([])
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isSavingStoreItem, setIsSavingStoreItem] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

	const isEditing = editingStoreItemId !== null
	const submitLabel = isEditing ? 'Save Store Item' : 'Add Store Item'

	const resetStoreItemForm = useCallback(() => {
		setEditingStoreItemId(null)
		setStoreItemKind('pet')
		setStoreItemName('')
		setStoreItemDescription('')
		setStoreItemSpecies('cat')
		setStoreItemPrice('0')
		setStoreItemTags('')
		setStoreItemIsActive(true)
		setStoreItemPhotoFile(null)
		setCurrentPhotoId(null)
		setStoreItemPhotoInputKey((key) => key + 1)
	}, [])

	const loadData = useCallback(async () => {
		if (!activeProfileId) {
			setWallet(null)
			setStoreItems([])
			return
		}

		setIsLoadingData(true)
		try {
			const [walletRecord, allStoreItems] = await Promise.all([
				economyService.getWallet(activeProfileId),
				storeRepo.listAll(),
			])
			setWallet(walletRecord)
			setStoreItems(allStoreItems)
			setErrorMessage(null)
		} catch (error: unknown) {
			logAppError('AdminPage.loadData', error, {
				metadata: {
					activeProfileId,
				},
			})
			setErrorMessage('Failed to load admin data.')
		} finally {
			setIsLoadingData(false)
		}
	}, [activeProfileId])

	useEffect(() => {
		void loadData()
	}, [loadData])

	useEffect(() => {
		let cancelled = false

		const loadPhotoUrls = async () => {
			const photoIds = [...new Set(storeItems.map((item) => item.photoId).filter((photoId): photoId is string => !!photoId))]
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
	}, [storeItems])

	useEffect(() => {
		return () => {
			for (const url of Object.values(photoUrls)) {
				URL.revokeObjectURL(url)
			}
		}
	}, [photoUrls])

	useEffect(() => {
		const loadErrors = () => {
			setRecentErrors(getRecentAppErrors(20))
		}

		loadErrors()
		const eventName = getErrorLogUpdatedEventName()
		window.addEventListener(eventName, loadErrors)
		return () => {
			window.removeEventListener(eventName, loadErrors)
		}
	}, [])

	const handleAdjustWallet = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!activeProfileId) {
			return
		}

		const deltaPetCoins = Number.parseInt(walletPetCoinsChange, 10)
		const deltaCoins = Number.parseInt(walletCoinsChange, 10)
		if (Number.isNaN(deltaPetCoins) || Number.isNaN(deltaCoins)) {
			setErrorMessage('Wallet changes must be whole numbers.')
			setStatusMessage(null)
			return
		}

		try {
			const result = await economyService.adjustWallet({
				profileId: activeProfileId,
				deltaPetCoins,
				deltaCoins,
				notes: walletNote,
			})
			setWallet(result.wallet)
			setWalletPetCoinsChange('0')
			setWalletCoinsChange('0')
			setWalletNote('')
			setStatusMessage('Wallet updated.')
			setErrorMessage(null)
		} catch (error: unknown) {
			if (error instanceof EconomyError) {
				setErrorMessage(error.message)
			} else {
				logAppError('AdminPage.handleAdjustWallet', error, {
					metadata: {
						activeProfileId,
						deltaPetCoins,
						deltaCoins,
					},
				})
				setErrorMessage('Failed to update wallet.')
			}
			setStatusMessage(null)
		} finally {
			void loadData()
		}
	}

	const handleSubmitStoreItem = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const parsedPrice = Number.parseInt(storeItemPrice, 10)
		if (Number.isNaN(parsedPrice)) {
			setErrorMessage('Price must be a whole number.')
			setStatusMessage(null)
			return
		}

		if (storeItemKind === 'pet' && storeItemSpecies === 'none') {
			setErrorMessage('Please choose a species for pet items.')
			setStatusMessage(null)
			return
		}

		setIsSavingStoreItem(true)
		try {
			let photoId = currentPhotoId
			if (storeItemPhotoFile) {
				const photo = await photoRepo.create({
					blob: storeItemPhotoFile,
					mimeType: storeItemPhotoFile.type || 'application/octet-stream',
				})
				photoId = photo.id
			}

			const type = toStoreType(storeItemKind)
			const speciesRestriction: StoreItem['speciesRestriction'] =
				storeItemKind === 'item'
					? storeItemSpecies === 'none'
						? null
						: storeItemSpecies
					: storeItemSpecies === 'none'
						? 'cat'
						: storeItemSpecies

			if (editingStoreItemId) {
				await economyService.updateStoreItem({
					id: editingStoreItemId,
					type,
					name: storeItemName,
					description: storeItemDescription,
					speciesRestriction,
					pricePetCoins: parsedPrice,
					priceCoins: parsedPrice,
					photoId,
					tags: parseTags(storeItemTags),
					isActive: storeItemIsActive,
				})
				setStatusMessage(`Updated "${storeItemName}".`)
			} else {
				await economyService.addCustomStoreItem({
					type,
					name: storeItemName,
					description: storeItemDescription,
					speciesRestriction,
					pricePetCoins: parsedPrice,
					priceCoins: parsedPrice,
					photoId,
					tags: parseTags(storeItemTags),
					isActive: storeItemIsActive,
				})
				setStatusMessage(`Added "${storeItemName}".`)
			}

			setErrorMessage(null)
			resetStoreItemForm()
		} catch (error: unknown) {
			if (error instanceof EconomyError) {
				setErrorMessage(error.message)
			} else {
				logAppError('AdminPage.handleSubmitStoreItem', error)
				setErrorMessage('Failed to save store item.')
			}
			setStatusMessage(null)
		} finally {
			setIsSavingStoreItem(false)
			void loadData()
		}
	}

	const handleEditStoreItem = (item: StoreItem) => {
		const kind = toDisplayType(item.type)
		setEditingStoreItemId(item.id)
		setStoreItemKind(kind)
		setStoreItemName(item.name)
		setStoreItemDescription(item.description)
		setStoreItemSpecies(item.speciesRestriction ?? (kind === 'pet' ? 'cat' : 'none'))
		setStoreItemPrice(String(kind === 'pet' ? item.pricePetCoins : item.priceCoins))
		setStoreItemTags(item.tags.join(', '))
		setStoreItemIsActive(item.isActive)
		setStoreItemPhotoFile(null)
		setCurrentPhotoId(item.photoId)
		setStoreItemPhotoInputKey((key) => key + 1)
	}

	const handleDeleteStoreItem = async (item: StoreItem) => {
		const confirmed = window.confirm(`Delete store item "${item.name}"?`)
		if (!confirmed) {
			return
		}

		try {
			await economyService.deleteStoreItem(item.id)
			if (editingStoreItemId === item.id) {
				resetStoreItemForm()
			}
			setStatusMessage(`Deleted "${item.name}".`)
			setErrorMessage(null)
		} catch (error: unknown) {
			if (error instanceof EconomyError) {
				setErrorMessage(error.message)
			} else {
				logAppError('AdminPage.handleDeleteStoreItem', error, {
					metadata: {
						storeItemId: item.id,
					},
				})
				setErrorMessage('Failed to delete store item.')
			}
			setStatusMessage(null)
		} finally {
			void loadData()
		}
	}

	const handleClearErrorLog = () => {
		const confirmed = window.confirm('Clear all stored diagnostics errors?')
		if (!confirmed) {
			return
		}
		clearAppErrors()
		setRecentErrors([])
	}

	const sortedStoreItems = useMemo(() => {
		return [...storeItems].sort((a, b) => a.name.localeCompare(b.name))
	}, [storeItems])

	if (isLoading) {
		return (
			<section className="panel">
				<h2>Admin</h2>
				<p>Loading profile context...</p>
			</section>
		)
	}

	if (!activeProfileId) {
		return (
			<section className="panel">
				<h2>Admin</h2>
				<p>Create or select a profile before using admin tools.</p>
			</section>
		)
	}

	return (
		<section className="panel">
			<h2>Admin</h2>
			<p>Manage store items, wallet balances, and diagnostics for profile: {activeProfile?.name ?? 'Unknown'}.</p>

			{statusMessage ? <p className="store-status">{statusMessage}</p> : null}
			{errorMessage ? <p className="store-error">{errorMessage}</p> : null}

			<section className="admin-section">
				<h3>Wallet Controls</h3>
				<div className="wallet-balance-card">
					<p>
						<strong>PetCoins:</strong> {wallet?.petCoins ?? 0}
					</p>
					<p>
						<strong>Coins:</strong> {wallet?.coins ?? 0}
					</p>
				</div>
				<form className="admin-form" onSubmit={handleAdjustWallet}>
					<div className="admin-grid">
						<label className="admin-field">
							<span>PetCoins Change (+/-)</span>
							<input
								type="number"
								value={walletPetCoinsChange}
								onChange={(event) => setWalletPetCoinsChange(event.target.value)}
								aria-label="Admin PetCoins change"
							/>
						</label>
						<label className="admin-field">
							<span>Coins Change (+/-)</span>
							<input
								type="number"
								value={walletCoinsChange}
								onChange={(event) => setWalletCoinsChange(event.target.value)}
								aria-label="Admin Coins change"
							/>
						</label>
						<label className="admin-field admin-field-wide">
							<span>Reason</span>
							<input
								type="text"
								value={walletNote}
								onChange={(event) => setWalletNote(event.target.value)}
								placeholder="Reason for wallet update"
								aria-label="Admin wallet reason"
							/>
						</label>
					</div>
					<button type="submit" disabled={!walletNote.trim()}>
						Apply Wallet Update
					</button>
				</form>
			</section>

			<section className="admin-section">
				<h3>Store Item Manager</h3>
				<form className="admin-form" onSubmit={handleSubmitStoreItem}>
					<div className="admin-grid">
						<label className="admin-field">
							<span>Type</span>
							<select
								value={storeItemKind}
								onChange={(event) => {
									const nextKind = event.target.value as StoreKind
									setStoreItemKind(nextKind)
									if (nextKind === 'item' && storeItemSpecies === 'cat') {
										setStoreItemSpecies('none')
									}
									if (nextKind === 'pet' && storeItemSpecies === 'none') {
										setStoreItemSpecies('cat')
									}
								}}
							>
								<option value="pet">Pet</option>
								<option value="item">Item</option>
							</select>
						</label>

						<label className="admin-field">
							<span>{storeItemKind === 'pet' ? 'Species' : 'Species Restriction'}</span>
							<select
								value={storeItemSpecies}
								onChange={(event) => setStoreItemSpecies(event.target.value as SpeciesChoice)}
							>
								{storeItemKind === 'item' ? <option value="none">None</option> : null}
								<option value="cat">Cat</option>
								<option value="dog">Dog</option>
								<option value="bird">Bird</option>
								<option value="bunny">Bunny</option>
								<option value="other">Other</option>
								<option value="mixed">Mixed</option>
							</select>
						</label>

						<label className="admin-field admin-field-wide">
							<span>Name</span>
							<input
								type="text"
								value={storeItemName}
								onChange={(event) => setStoreItemName(event.target.value)}
								placeholder="Item name"
							/>
						</label>

						<label className="admin-field admin-field-wide">
							<span>Description</span>
							<input
								type="text"
								value={storeItemDescription}
								onChange={(event) => setStoreItemDescription(event.target.value)}
								placeholder="Item description"
							/>
						</label>

						<label className="admin-field">
							<span>{storeItemKind === 'pet' ? 'PetCoins Price' : 'Coins Price'}</span>
							<input
								type="number"
								min={0}
								value={storeItemPrice}
								onChange={(event) => setStoreItemPrice(event.target.value)}
								aria-label="Store item price"
							/>
						</label>

						<label className="admin-field admin-field-wide">
							<span>Tags (comma-separated)</span>
							<input
								type="text"
								value={storeItemTags}
								onChange={(event) => setStoreItemTags(event.target.value)}
								placeholder="toy, cat, favorite"
							/>
						</label>

						<label className="admin-field admin-field-wide admin-field-file">
							<span>Item Photo (optional)</span>
							<input
								key={storeItemPhotoInputKey}
								type="file"
								accept="image/*"
								capture="environment"
								onChange={(event) => setStoreItemPhotoFile(event.target.files?.[0] ?? null)}
							/>
						</label>

						<label className="admin-field admin-field-toggle">
							<input
								type="checkbox"
								checked={storeItemIsActive}
								onChange={(event) => setStoreItemIsActive(event.target.checked)}
							/>
							<span>Active Item</span>
						</label>
					</div>

					<div className="admin-actions">
						<button type="submit" disabled={!storeItemName.trim() || isSavingStoreItem}>
							{isSavingStoreItem ? 'Saving...' : submitLabel}
						</button>
						{isEditing ? (
							<button type="button" onClick={resetStoreItemForm}>
								Cancel Edit
							</button>
						) : null}
					</div>
				</form>

				<section className="admin-list-section">
					<h4>Existing Store Items</h4>
					<p className="inventory-result-count">
						{isLoadingData ? 'Loading store items...' : `Showing ${sortedStoreItems.length} store items`}
					</p>
					{sortedStoreItems.length === 0 ? <p>No store items yet.</p> : null}
					{sortedStoreItems.length > 0 ? (
						<ul className="store-item-list">
							{sortedStoreItems.map((item) => {
								const itemPhotoUrl = item.photoId ? photoUrls[item.photoId] : null
								return (
									<li className="store-item-card" key={item.id}>
										<div className="store-item-main">
											<div className="store-item-thumb">
												{itemPhotoUrl ? <img src={itemPhotoUrl} alt={`${item.name} art`} /> : <span>No Photo</span>}
											</div>
											<div>
												<h3>{item.name}</h3>
												<p>{item.description}</p>
												<p>
													<strong>Type:</strong> {toDisplayType(item.type) === 'pet' ? 'Pet' : 'Item'}
												</p>
												<p>
													<strong>Species:</strong> {item.speciesRestriction ?? 'None'}
												</p>
												<p>
													<strong>Cost:</strong> {getCostText(item)}
												</p>
												<p>
													<strong>Active:</strong> {item.isActive ? 'Yes' : 'No'}
												</p>
												<TagList tags={item.tags} emptyLabel="No tags" />
											</div>
										</div>
										<div className="store-item-actions">
											<button type="button" onClick={() => handleEditStoreItem(item)}>
												Edit
											</button>
											<button type="button" onClick={() => handleDeleteStoreItem(item)}>
												Delete
											</button>
										</div>
									</li>
								)
							})}
						</ul>
					) : null}
				</section>
			</section>

			<section className="admin-section">
				<div className="profiles-diagnostics-header">
					<h3>Diagnostics: Recent Errors</h3>
					<button type="button" onClick={handleClearErrorLog} disabled={recentErrors.length === 0}>
						Clear Error Log
					</button>
				</div>
				<p>Detailed local errors are kept on this device to help troubleshooting when a generic message appears.</p>
				{recentErrors.length === 0 ? <p>No recent errors logged.</p> : null}
				{recentErrors.length > 0 ? (
					<ul className="profiles-diagnostics-list">
						{recentErrors.map((entry) => (
							<li className="profiles-diagnostics-item" key={entry.id}>
								<p>
									<strong>{new Date(entry.timestamp).toLocaleString()}</strong> [{entry.source}] {entry.context}
								</p>
								<p>
									<strong>Message:</strong> {entry.message}
								</p>
								{entry.errorName ? (
									<p>
										<strong>Error Type:</strong> {entry.errorName}
									</p>
								) : null}
								{Object.keys(entry.metadata).length > 0 ? (
									<p>
										<strong>Metadata:</strong> {JSON.stringify(entry.metadata)}
									</p>
								) : null}
								{entry.stack ? (
									<details>
										<summary>Stack Trace</summary>
										<pre>{entry.stack}</pre>
									</details>
								) : null}
							</li>
						))}
					</ul>
				) : null}
			</section>
		</section>
	)
}
