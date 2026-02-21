import { useActiveProfile } from '../context/useActiveProfile'

export const StorePage = () => {
	const { activeProfile, isLoading } = useActiveProfile()

	return (
		<section className="panel">
			<h2>Store</h2>
			<p>{isLoading ? 'Loading profile context...' : `Profile: ${activeProfile?.name ?? 'No active profile'}`}</p>
			<p>Store catalog, purchase flows, and pricing checks are scheduled for Phase 05.</p>
			<ul>
				<li>Catalog filters by type and species</li>
				<li>Wallet deduction checks</li>
				<li>Pet and supply purchase actions</li>
			</ul>
		</section>
	)
}
