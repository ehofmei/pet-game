import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageInfoCard } from '../components/ImageInfoCard'
import { TagList } from '../components/TagList'
import { useActiveProfile } from '../context/useActiveProfile'
import { appDb, EconomyError, EconomyService, InventoryRepo, PhotoRepo, StoreRepo, TransactionRepo } from '../db'
import type { InventoryItem, StoreItem, Wallet } from '../models'
import { logAppError } from '../utils'

type TypeFilter = 'all' | 'pet' | 'item'
type SpeciesFilter = 'all' | NonNullable<StoreItem['speciesRestriction']> | 'none'

type InventoryRow = {
	inventoryItem: InventoryItem
	storeItem: StoreItem | null
}

const inventoryRepo = new InventoryRepo(appDb)
const photoRepo = new PhotoRepo(appDb)
const storeRepo = new StoreRepo(appDb)
const transactionRepo = new TransactionRepo(appDb)
const economyService = new EconomyService(appDb)

const getInventoryTypeLabel = (itemType: StoreItem['type'] | undefined): string => {
	if (!itemType) {
		return 'Unknown'
	}
	return itemType === 'pet' ? 'Pet' : 'Item'
}

export const InventoryPage = () => {
	const { activeProfile, activeProfileId, isLoading } = useActiveProfile()
	const [wallet, setWallet] = useState<Wallet | null>(null)
	const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
	const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>('all')
	const [tagFilter, setTagFilter] = useState('')
	const [isLoadingData, setIsLoadingData] = useState(false)
	const [isAdjustingItemId, setIsAdjustingItemId] = useState<string | null>(null)
	const [recentLogs, setRecentLogs] = useState<
		{
			id: string
			createdAt: string
			kind: string
			deltaPetCoins: number
			deltaCoins: number
			notes: string
		}[]
	>([])
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

	const loadData = useCallback(async () => {
		if (!activeProfileId) {
			setWallet(null)
			setInventoryRows([])
			setRecentLogs([])
			return
		}

		setIsLoadingData(true)
		try {
			const [walletRecord, inventoryItems, storeItems, transactionLogs] = await Promise.all([
				economyService.getWallet(activeProfileId),
				inventoryRepo.listByProfile(activeProfileId),
				storeRepo.listAll(),
				transactionRepo.listByProfile(activeProfileId),
			])

			const storeItemById = new Map(storeItems.map((item) => [item.id, item]))
			const rows = inventoryItems.map((item) => ({
				inventoryItem: item,
				storeItem: storeItemById.get(item.itemId) ?? null,
			}))

			setWallet(walletRecord)
			setInventoryRows(rows)
			setRecentLogs(
				[...transactionLogs]
					.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
					.slice(0, 20)
					.map((log) => ({
						id: log.id,
						createdAt: log.createdAt,
						kind: log.kind,
						deltaPetCoins: log.deltaPetCoins,
						deltaCoins: log.deltaCoins,
						notes: log.notes,
					})),
			)
			setErrorMessage(null)
		} catch (error: unknown) {
			logAppError('InventoryPage.loadData', error, {
				metadata: {
					activeProfileId: activeProfileId ?? 'none',
				},
			})
			setErrorMessage('Failed to load inventory data.')
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
			const photoIds = [
				...new Set(
					inventoryRows
						.map((row) => row.storeItem?.photoId)
						.filter((photoId): photoId is string => !!photoId),
				),
			]
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
	}, [inventoryRows])

	useEffect(() => {
		return () => {
			for (const url of Object.values(photoUrls)) {
				URL.revokeObjectURL(url)
			}
		}
	}, [photoUrls])

	const filteredRows = useMemo(() => {
		const loweredTag = tagFilter.trim().toLowerCase()

		return inventoryRows.filter((row) => {
			const storeItem = row.storeItem

			if (typeFilter !== 'all') {
				if (typeFilter === 'pet' && storeItem?.type !== 'pet') {
					return false
				}
				if (typeFilter === 'item' && storeItem?.type === 'pet') {
					return false
				}
			}

			if (speciesFilter !== 'all') {
				if (speciesFilter === 'none') {
					if (storeItem?.speciesRestriction !== null) {
						return false
					}
				} else if (storeItem?.speciesRestriction !== speciesFilter) {
					return false
				}
			}

			if (!loweredTag) {
				return row.inventoryItem.quantity > 0
			}

			const tags = storeItem?.tags ?? []
			return row.inventoryItem.quantity > 0 && tags.some((tag) => tag.toLowerCase().includes(loweredTag))
		})
	}, [inventoryRows, typeFilter, speciesFilter, tagFilter])

	const handleAdjustInventory = async (itemId: string, delta: number, itemName: string) => {
		if (!activeProfileId) {
			return
		}
		const actionLabel = delta > 0 ? 'increase' : 'decrease'
		const confirmed = window.confirm(`Confirm ${actionLabel} quantity for "${itemName}" by ${Math.abs(delta)}?`)
		if (!confirmed) {
			return
		}
		const reason = window.prompt('Reason for inventory adjustment (required):', `Manual ${actionLabel}`)?.trim() ?? ''
		if (!reason) {
			setErrorMessage('Inventory adjustment reason is required.')
			setStatusMessage(null)
			return
		}

		setIsAdjustingItemId(itemId)
		try {
			await economyService.adjustInventory({
				profileId: activeProfileId,
				itemId,
				quantityDelta: delta,
				notes: reason,
			})
			setStatusMessage(`Updated "${itemName}" quantity by ${delta}.`)
			setErrorMessage(null)
		} catch (error: unknown) {
			if (error instanceof EconomyError) {
				setErrorMessage(error.message)
			} else {
				logAppError('InventoryPage.handleAdjustInventory', error, {
					metadata: {
						activeProfileId: activeProfileId ?? 'none',
						itemId,
						delta,
					},
				})
				setErrorMessage('Failed to adjust inventory.')
			}
			setStatusMessage(null)
		} finally {
			setIsAdjustingItemId(null)
			void loadData()
		}
	}

	return (
		<section className="panel">
			<h2>Inventory</h2>
			<p>{isLoading ? 'Loading profile context...' : `Profile: ${activeProfile?.name ?? 'No active profile'}`}</p>

			<div className="wallet-balance-card">
				<p>
					<strong>PetCoins:</strong> {wallet?.petCoins ?? 0}
				</p>
				<p>
					<strong>Coins:</strong> {wallet?.coins ?? 0}
				</p>
			</div>

			<div className="inventory-filter-grid">
				<label className="inventory-field">
					<span>Type</span>
					<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
						<option value="all">All</option>
						<option value="pet">Pet</option>
						<option value="item">Item</option>
					</select>
				</label>
				<label className="inventory-field">
					<span>Species Restriction</span>
					<select
						value={speciesFilter}
						onChange={(event) => setSpeciesFilter(event.target.value as SpeciesFilter)}
					>
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
				<label className="inventory-field">
					<span>Tag Filter</span>
					<input
						type="text"
						value={tagFilter}
						onChange={(event) => setTagFilter(event.target.value)}
						placeholder="tag contains"
						aria-label="Inventory tag filter"
					/>
				</label>
			</div>

			{statusMessage ? <p className="inventory-status">{statusMessage}</p> : null}
			{errorMessage ? <p className="inventory-error">{errorMessage}</p> : null}
			<p className="inventory-result-count">
				{isLoadingData ? 'Loading inventory...' : `Showing ${filteredRows.length} of ${inventoryRows.length} inventory items`}
			</p>

			{!isLoadingData && filteredRows.length === 0 ? <p>No inventory items match current filters.</p> : null}
			{filteredRows.length > 0 ? (
				<ul className="visual-card-list inventory-card-list">
					{filteredRows.map((row) => {
						const item = row.storeItem
						const itemName = item?.name ?? `Unknown Item (${row.inventoryItem.itemId})`
						const itemPhotoUrl = item?.photoId ? photoUrls[item.photoId] : null
						return (
							<li className="visual-card-list-item" key={row.inventoryItem.id}>
								<ImageInfoCard
									title={itemName}
									subtitle={`${getInventoryTypeLabel(item?.type)} | ${item?.speciesRestriction ?? 'none'}`}
									imageUrl={itemPhotoUrl}
									imageAlt={`${itemName} art`}
									badges={[{ label: `Qty: ${row.inventoryItem.quantity}` }]}
									content={
										<>
											<p className="image-info-card-label">Tags</p>
											<TagList tags={item?.tags ?? []} emptyLabel="No tags" />
										</>
									}
									footer={
										<div className="inventory-item-actions">
											<button
												type="button"
												onClick={() => handleAdjustInventory(row.inventoryItem.itemId, -1, itemName)}
												disabled={row.inventoryItem.quantity <= 0 || isAdjustingItemId === row.inventoryItem.itemId}
												aria-label={`Decrease ${itemName}`}
											>
												-1
											</button>
											<button
												type="button"
												onClick={() => handleAdjustInventory(row.inventoryItem.itemId, 1, itemName)}
												disabled={isAdjustingItemId === row.inventoryItem.itemId}
												aria-label={`Increase ${itemName}`}
											>
												+1
											</button>
										</div>
									}
								/>
							</li>
						)
					})}
				</ul>
			) : null}

			<section className="inventory-logs">
				<h3>Recent Transactions</h3>
				{recentLogs.length === 0 ? <p>No transactions yet.</p> : null}
				{recentLogs.length > 0 ? (
					<ul className="inventory-log-list">
						{recentLogs.map((log) => (
							<li key={log.id}>
								<strong>{new Date(log.createdAt).toLocaleString()}</strong> [{log.kind}] PetCoins {log.deltaPetCoins},
								Coins {log.deltaCoins} - {log.notes}
							</li>
						))}
					</ul>
				) : null}
			</section>
		</section>
	)
}
