import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageInfoCard } from '../components/ImageInfoCard'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import { appDb, EconomyError, EconomyService, PhotoRepo, StoreRepo } from '../db'
import type { StoreItem, Wallet } from '../models'
import { logAppError } from '../utils'

const storeRepo = new StoreRepo(appDb)
const photoRepo = new PhotoRepo(appDb)
const economyService = new EconomyService(appDb)

type TypeFilter = 'all' | 'pet' | 'item'
type SpeciesFilter = 'all' | NonNullable<StoreItem['speciesRestriction']> | 'none'

const getStoreTypeLabel = (type: StoreItem['type']): 'Pet' | 'Item' => {
	return type === 'pet' ? 'Pet' : 'Item'
}

const getPriceLabel = (item: StoreItem): string => {
	if (item.type === 'pet') {
		return `${item.pricePetCoins} PetCoins`
	}
	return `${item.priceCoins} Coins`
}

export const StorePage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [storeItems, setStoreItems] = useState<StoreItem[]>([])
	const [wallet, setWallet] = useState<Wallet | null>(null)
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
	const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all')
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isBuyingId, setIsBuyingId] = useState<string | null>(null)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

	const loadData = useCallback(async () => {
		if (!activeProfileId) {
			setStoreItems([])
			setWallet(null)
			return
		}

		setIsLoadingData(true)
		try {
			const [items, nextWallet] = await Promise.all([
				storeRepo.listActive(),
				economyService.getWallet(activeProfileId),
			])
			setStoreItems(items)
			setWallet(nextWallet)
			setErrorMessage(null)
		} catch (error: unknown) {
			logAppError('StorePage.loadData', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
				},
			})
			setErrorMessage('Failed to load store data.')
		} finally {
			setIsLoadingData(false)
		}
	}, [activeProfileId])

	useEffect(() => {
		setStatusMessage(null)
		setErrorMessage(null)
		void loadData()
	}, [activeProfileId, loadData])

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

	const filteredItems = useMemo(() => {
		return storeItems.filter((item) => {
			if (typeFilter !== 'all') {
				if (typeFilter === 'pet' && item.type !== 'pet') {
					return false
				}
				if (typeFilter === 'item' && item.type === 'pet') {
					return false
				}
			}

			if (speciesFilter === 'all') {
				return true
			}
			if (speciesFilter === 'none') {
				return item.speciesRestriction === null
			}
			return item.speciesRestriction === speciesFilter
		})
	}, [storeItems, typeFilter, speciesFilter])

	const canAfford = (item: StoreItem): boolean => {
		if (!wallet) {
			return false
		}
		return wallet.petCoins >= item.pricePetCoins && wallet.coins >= item.priceCoins
	}

	const handleBuy = async (item: StoreItem) => {
		if (!activeProfileId) {
			return
		}

		setIsBuyingId(item.id)
		try {
			const result = await economyService.purchaseStoreItem({
				profileId: activeProfileId,
				storeItemId: item.id,
			})
			setWallet(result.wallet)
			setStatusMessage(
				item.type === 'pet'
					? `Purchased pet "${item.name}" and added to Pets.`
					: `Purchased "${item.name}" and added to Inventory.`,
			)
			setErrorMessage(null)
		} catch (error: unknown) {
			if (error instanceof EconomyError) {
				setErrorMessage(error.message)
			} else {
				logAppError('StorePage.handleBuy', error, {
					metadata: {
						activeProfileId: activeProfileId ?? 'none',
						storeItemId: item.id,
					},
				})
				setErrorMessage('Failed to complete purchase.')
			}
			setStatusMessage(null)
		} finally {
			setIsBuyingId(null)
			void loadData()
		}
	}

	return (
		<section className="panel">
			<h2>Store</h2>
			<p>{isLoading ? 'Loading profile context...' : `Profile: ${activeProfile?.name ?? 'No active profile'}`}</p>
			<div className="wallet-balance-card">
				<p>
					<strong>PetCoins:</strong> {wallet?.petCoins ?? 0}
				</p>
				<p>
					<strong>Coins:</strong> {wallet?.coins ?? 0}
				</p>
			</div>

			<div className="store-filter-grid">
				<label className="store-field">
					<span>Type</span>
					<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
						<option value="all">All</option>
						<option value="pet">Pet</option>
						<option value="item">Item</option>
					</select>
				</label>
				<label className="store-field">
					<span>Species Restriction</span>
					<select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value as SpeciesFilter)}>
						<option value="all">All</option>
						<option value="none">None</option>
						<option value="cat">Cat</option>
						<option value="dog">Dog</option>
						<option value="bird">Bird</option>
						<option value="bunny">Bunny</option>
						<option value="other">Other</option>
						<option value="mixed">Mixed</option>
					</select>
				</label>
			</div>

			{statusMessage ? <p className="store-status">{statusMessage}</p> : null}
			{errorMessage ? <p className="store-error">{errorMessage}</p> : null}
			<p className="store-result-count">
				{isLoadingData ? 'Loading store...' : `Showing ${filteredItems.length} of ${storeItems.length} items`}
			</p>

			{!isLoadingData && filteredItems.length === 0 ? <p>No store items match current filters.</p> : null}
			{filteredItems.length > 0 ? (
				<ul className="visual-card-list store-card-list">
					{filteredItems.map((item) => {
						const affordable = canAfford(item)
						const itemPhotoUrl = item.photoId ? photoUrls[item.photoId] : null
						return (
							<li className="visual-card-list-item" key={item.id}>
								<ImageInfoCard
									title={item.name}
									subtitle={`${getStoreTypeLabel(item.type)} | ${item.speciesRestriction ?? 'none'}`}
									imageUrl={itemPhotoUrl}
									imageAlt={`${item.name} art`}
									badges={[{ label: getPriceLabel(item) }]}
									content={
										<>
											<p>{item.description}</p>
											<p className="image-info-card-label">Tags</p>
											<TagList tags={item.tags} emptyLabel="No tags" />
										</>
									}
									footer={
										<div className="store-item-actions">
											<button
												type="button"
												onClick={() => handleBuy(item)}
												disabled={!wallet || !affordable || isBuyingId === item.id}
												aria-label={`Buy ${item.name}`}
											>
												{isBuyingId === item.id ? 'Buying...' : 'Buy'}
											</button>
											{!affordable ? <p className="store-error-mini">Insufficient balance</p> : null}
										</div>
									}
								/>
							</li>
						)
					})}
				</ul>
			) : null}
		</section>
	)
}
