import { useActiveProfile } from '../context/useActiveProfile'

export const BreedPage = () => {
	const { activeProfile, isLoading } = useActiveProfile()

	return (
		<section className="panel">
			<h2>Breed</h2>
			<p>{isLoading ? 'Loading profile context...' : `Profile: ${activeProfile?.name ?? 'No active profile'}`}</p>
			<p>Breeding logic, validation, and baby creation are scheduled for Phase 06.</p>
			<ul>
				<li>Select two parent pets</li>
				<li>Consume breeding session item or coins</li>
				<li>Create baby pet and log breeding event</li>
			</ul>
		</section>
	)
}
