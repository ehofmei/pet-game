import { createContext } from 'react'
import type { Profile } from '../models'

export type ActiveProfileContextValue = {
	profiles: Profile[]
	activeProfile: Profile | null
	activeProfileId: string | null
	isLoading: boolean
	error: string | null
	selectProfile: (profileId: string) => void
	createProfile: (name: string) => Promise<void>
	renameProfile: (profileId: string, name: string) => Promise<void>
	deleteProfile: (profileId: string) => Promise<void>
	refreshProfiles: () => Promise<void>
}

export const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(undefined)
