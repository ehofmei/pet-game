import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initializeDatabase, ProfileRepo, WalletRepo, appDb } from '../db'
import type { Profile } from '../models'
import { logAppError } from '../utils'
import { ActiveProfileContext, type ActiveProfileContextValue } from './activeProfileContextObject'

const ACTIVE_PROFILE_STORAGE_KEY = 'pet-breeder-cards.active-profile-id'

const profileRepo = new ProfileRepo(appDb)
const walletRepo = new WalletRepo(appDb)

const getStoredActiveProfileId = (): string | null => {
	return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
}

const setStoredActiveProfileId = (profileId: string | null): void => {
	if (!profileId) {
		window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY)
		return
	}

	window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId)
}

type ActiveProfileProviderProps = {
	children: ReactNode
}

export const ActiveProfileProvider = ({ children }: ActiveProfileProviderProps) => {
	const [profiles, setProfiles] = useState<Profile[]>([])
	const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const refreshProfiles = useCallback(async () => {
		const nextProfiles = await profileRepo.list()
		setProfiles(nextProfiles)

		if (nextProfiles.length === 0) {
			setActiveProfileId(null)
			setStoredActiveProfileId(null)
			return
		}

		const storedId = getStoredActiveProfileId()
		const currentId = activeProfileId
		const preferredId = storedId ?? currentId
		const hasPreferred = preferredId ? nextProfiles.some((profile) => profile.id === preferredId) : false
		const resolvedId = hasPreferred ? preferredId : nextProfiles[0].id
		setActiveProfileId(resolvedId)
		setStoredActiveProfileId(resolvedId)
	}, [activeProfileId])

	useEffect(() => {
		const load = async () => {
			try {
				setError(null)
				await initializeDatabase()
				await refreshProfiles()
			} catch (err: unknown) {
				const errorName =
					typeof err === 'object' && err !== null && 'name' in err
						? String((err as { name: unknown }).name)
						: ''
				if (errorName !== 'DatabaseClosedError') {
					logAppError('ActiveProfileProvider.initializeDatabase', err, {
						metadata: {
							errorName,
						},
					})
				}
				setError('Failed to load profiles.')
			} finally {
				setIsLoading(false)
			}
		}

		void load()
	}, [refreshProfiles])

	const selectProfile = useCallback((profileId: string) => {
		setActiveProfileId(profileId)
		setStoredActiveProfileId(profileId)
	}, [])

	const createProfile = useCallback(async (name: string) => {
		const trimmedName = name.trim()
		if (!trimmedName) {
			return
		}

		setError(null)
		const profile = await profileRepo.create({ name: trimmedName })
		await walletRepo.ensureForProfile({
			profileId: profile.id,
			petCoins: 0,
			coins: 0,
		})
		await refreshProfiles()
		selectProfile(profile.id)
	}, [refreshProfiles, selectProfile])

	const renameProfile = useCallback(async (profileId: string, name: string) => {
		const trimmedName = name.trim()
		if (!trimmedName) {
			return
		}

		setError(null)
		await profileRepo.rename(profileId, trimmedName)
		await refreshProfiles()
	}, [refreshProfiles])

	const deleteProfile = useCallback(async (profileId: string) => {
		if (profiles.length <= 1) {
			throw new Error('Cannot delete the last remaining profile.')
		}

		setError(null)
		await appDb.transaction(
			'rw',
			[
				appDb.profiles,
				appDb.wallets,
				appDb.pets,
				appDb.inventoryItems,
				appDb.transactionLogs,
				appDb.breedingEvents,
			],
			async () => {
				await appDb.pets.where('profileId').equals(profileId).delete()
				await appDb.inventoryItems.where('profileId').equals(profileId).delete()
				await appDb.transactionLogs.where('profileId').equals(profileId).delete()
				await appDb.breedingEvents.where('profileId').equals(profileId).delete()
				await appDb.wallets.delete(profileId)
				await appDb.profiles.delete(profileId)
			},
		)

		await refreshProfiles()
	}, [profiles.length, refreshProfiles])

	const activeProfile = useMemo(
		() => profiles.find((profile) => profile.id === activeProfileId) ?? null,
		[profiles, activeProfileId],
	)

	const value = useMemo<ActiveProfileContextValue>(
		() => ({
			profiles,
			activeProfile,
			activeProfileId,
			isLoading,
			error,
			selectProfile,
			createProfile,
			renameProfile,
			deleteProfile,
			refreshProfiles,
		}),
		[
			profiles,
			activeProfile,
			activeProfileId,
			isLoading,
			error,
			selectProfile,
			createProfile,
			renameProfile,
			deleteProfile,
			refreshProfiles,
		],
	)

	return <ActiveProfileContext.Provider value={value}>{children}</ActiveProfileContext.Provider>
}
