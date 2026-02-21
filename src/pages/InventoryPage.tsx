import { useActiveProfile } from '../context/useActiveProfile'

export const InventoryPage = () => {
	const { activeProfile, isLoading } = useActiveProfile()

	return (
		<section className="panel">
			<h2>Inventory</h2>
			<p>{isLoading ? 'Loading profile context...' : `Profile: ${activeProfile?.name ?? 'No active profile'}`}</p>
			<p>Inventory quantities, wallet balances, and quick adjustments are planned in Phase 05.</p>
			<ul>
				<li>Per-profile item quantities</li>
				<li>PetCoins and coins balance display</li>
				<li>Transaction logging hooks</li>
			</ul>
		</section>
	)
}
