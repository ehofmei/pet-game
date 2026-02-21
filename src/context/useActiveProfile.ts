import { useContext } from 'react'
import { ActiveProfileContext } from './activeProfileContextObject'

export const useActiveProfile = () => {
	const context = useContext(ActiveProfileContext)
	if (!context) {
		throw new Error('useActiveProfile must be used within ActiveProfileProvider')
	}
	return context
}
