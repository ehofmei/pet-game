import { useMemo, useState } from 'react'
import { useActiveProfile } from '../context/useActiveProfile'

export const ProfilesPage = () => {
	const { profiles, activeProfileId, isLoading, error, selectProfile, createProfile, renameProfile, deleteProfile } =
		useActiveProfile()
	const [newProfileName, setNewProfileName] = useState('')
	const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({})
	const [mutationError, setMutationError] = useState<string | null>(null)

	const canDeleteProfiles = useMemo(() => profiles.length > 1, [profiles.length])

	if (isLoading) {
		return (
			<section className="panel">
				<h2>Profiles</h2>
				<p>Loading profiles...</p>
			</section>
		)
	}

	const handleCreateProfile = async () => {
		try {
			setMutationError(null)
			await createProfile(newProfileName)
			setNewProfileName('')
		} catch (err: unknown) {
			console.error('Failed to create profile', err)
			setMutationError('Failed to create profile. Try again.')
		}
	}

	const handleRenameProfile = async (profileId: string, fallbackName: string) => {
		const draftName = renameDrafts[profileId] ?? fallbackName
		try {
			setMutationError(null)
			await renameProfile(profileId, draftName)
		} catch (err: unknown) {
			console.error('Failed to rename profile', err)
			setMutationError('Failed to rename profile. Try again.')
		}
	}

	const handleDeleteProfile = async (profileId: string, profileName: string) => {
		if (!canDeleteProfiles) {
			setMutationError('You must keep at least one profile.')
			return
		}

		const confirmed = window.confirm(`Delete profile "${profileName}"? This removes its local data.`)
		if (!confirmed) {
			return
		}

		try {
			setMutationError(null)
			await deleteProfile(profileId)
		} catch (err: unknown) {
			console.error('Failed to delete profile', err)
			setMutationError('Failed to delete profile. Try again.')
		}
	}

	return (
		<section className="panel">
			<h2>Profiles</h2>
			<p>Each profile has separate pets, inventory, and wallet balances on this device.</p>

			<div className="profiles-create-row">
				<label className="profiles-field">
					<span>New profile name</span>
					<input
						type="text"
						value={newProfileName}
						onChange={(event) => setNewProfileName(event.target.value)}
						placeholder="New profile name"
					/>
				</label>
				<button type="button" onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
					Add Profile
				</button>
			</div>

			{error ? <p className="profiles-error">{error}</p> : null}
			{mutationError ? <p className="profiles-error">{mutationError}</p> : null}

			<ul className="profiles-list">
				{profiles.map((profile) => {
					const isActive = profile.id === activeProfileId
					const renameValue = renameDrafts[profile.id] ?? profile.name
					return (
						<li className="profiles-item" key={profile.id}>
							<div className="profiles-item-header">
								<h3>{profile.name}</h3>
								{isActive ? <span className="profiles-active-pill">Active</span> : null}
							</div>

							<label className="profiles-field">
								<span>Rename</span>
								<input
									type="text"
									value={renameValue}
									onChange={(event) =>
										setRenameDrafts((prev) => ({
											...prev,
											[profile.id]: event.target.value,
										}))
									}
								/>
							</label>

							<div className="profiles-actions">
								<button
									type="button"
									onClick={() => selectProfile(profile.id)}
									disabled={isActive}
									aria-label={`Set Active ${profile.name}`}
								>
									{isActive ? 'Current Profile' : 'Make Active'}
								</button>
								<button
									type="button"
									onClick={() => handleRenameProfile(profile.id, profile.name)}
									disabled={!renameValue.trim()}
									aria-label={`Rename ${profile.name}`}
								>
									Save Name
								</button>
								<button
									type="button"
									onClick={() => handleDeleteProfile(profile.id, profile.name)}
									disabled={!canDeleteProfiles}
									aria-label={`Delete ${profile.name}`}
								>
									Delete
								</button>
							</div>
						</li>
					)
				})}
			</ul>
		</section>
	)
}
