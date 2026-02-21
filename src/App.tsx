import { useEffect, useMemo, useState } from 'react'
import { AdminPage } from './pages/AdminPage'
import { TabNav, type TabOption } from './components/TabNav'
import { ActiveProfileProvider } from './context/ActiveProfileContext'
import { useActiveProfile } from './context/useActiveProfile'
import { BreedPage } from './pages/BreedPage'
import { InventoryPage } from './pages/InventoryPage'
import { PetsPage } from './pages/PetsPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { StorePage } from './pages/StorePage'
import './App.css'

type TabKey = 'pets' | 'breed' | 'store' | 'inventory' | 'profiles' | 'admin'

const TAB_OPTIONS: TabOption<TabKey>[] = [
	{ key: 'pets', label: 'Pets' },
	{ key: 'breed', label: 'Breed' },
	{ key: 'store', label: 'Store' },
	{ key: 'inventory', label: 'Inventory' },
	{ key: 'profiles', label: 'Profiles' },
	{ key: 'admin', label: 'Admin' },
]

const TAB_DETAILS: Record<TabKey, string> = {
	pets: 'Create and manage your pet cards with photos.',
	breed: 'Pair parent pets and run breeding sessions.',
	store: 'Browse and buy pets, supplies, and session tokens.',
	inventory: 'Track your items and currency balances.',
	profiles: 'Manage local family profiles and app settings.',
	admin: 'Parent tools for wallets, store catalog, and diagnostics.',
}

const getInitialTab = (): TabKey => {
	const hashValue = window.location.hash.replace('#/', '') as TabKey
	return TAB_OPTIONS.some((tab) => tab.key === hashValue) ? hashValue : 'pets'
}

const AppShell = () => {
	const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
	const { activeProfile, isLoading: profileLoading } = useActiveProfile()

	useEffect(() => {
		window.location.hash = `/${activeTab}`
	}, [activeTab])

	useEffect(() => {
		const handleHashChange = () => {
			setActiveTab(getInitialTab())
		}

		window.addEventListener('hashchange', handleHashChange)
		return () => {
			window.removeEventListener('hashchange', handleHashChange)
		}
	}, [])

	const page = useMemo(() => {
		switch (activeTab) {
			case 'pets':
				return <PetsPage />
			case 'breed':
				return <BreedPage />
			case 'store':
				return <StorePage />
			case 'inventory':
				return <InventoryPage />
			case 'profiles':
				return <ProfilesPage />
			case 'admin':
				return <AdminPage />
			default:
				return <PetsPage />
		}
	}, [activeTab])

	return (
		<div className="app-shell">
			<header className="app-header">
				<p className="app-eyebrow">Offline-First PWA</p>
				<h1>Pet Breeder Cards</h1>
				<p className="app-subtitle">{TAB_DETAILS[activeTab]}</p>
				<p className="app-profile-chip">
					{profileLoading
						? 'Active Profile: Loading...'
						: `Active Profile: ${activeProfile?.name ?? 'None'}`}
				</p>
			</header>

			<main className="app-content" aria-live="polite">
				{page}
			</main>

			<TabNav tabs={TAB_OPTIONS} activeTab={activeTab} onTabChange={setActiveTab} />
		</div>
	)
}

function App() {
	return (
		<ActiveProfileProvider>
			<AppShell />
		</ActiveProfileProvider>
	)
}

export default App
