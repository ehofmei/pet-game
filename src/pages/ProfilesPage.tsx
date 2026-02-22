import { useMemo, useState, type ChangeEvent } from 'react'
import { appDb, exportBackupData, importBackupData, parseBackupPayload } from '../db'
import { useActiveProfile } from '../context/useActiveProfile'
import { logAppError } from '../utils'

export const ProfilesPage = () => {
	const { profiles, activeProfileId, isLoading, error, selectProfile, createProfile, renameProfile, deleteProfile } =
		useActiveProfile()
	const [newProfileName, setNewProfileName] = useState('')
	const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({})
	const [mutationError, setMutationError] = useState<string | null>(null)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)
	const [isImporting, setIsImporting] = useState(false)

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
			setStatusMessage(null)
			await createProfile(newProfileName)
			setNewProfileName('')
		} catch (err: unknown) {
			logAppError('ProfilesPage.handleCreateProfile', err)
			setMutationError('Failed to create profile. Try again.')
		}
	}

	const handleRenameProfile = async (profileId: string, fallbackName: string) => {
		const draftName = renameDrafts[profileId] ?? fallbackName
		try {
			setMutationError(null)
			setStatusMessage(null)
			await renameProfile(profileId, draftName)
		} catch (err: unknown) {
			logAppError('ProfilesPage.handleRenameProfile', err, {
				metadata: {
					profileId,
				},
			})
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
			setStatusMessage(null)
			await deleteProfile(profileId)
		} catch (err: unknown) {
			logAppError('ProfilesPage.handleDeleteProfile', err, {
				metadata: {
					profileId,
				},
			})
			setMutationError('Failed to delete profile. Try again.')
		}
	}

	const handleExportData = async () => {
		try {
			setMutationError(null)
			setStatusMessage(null)
			const payload = await exportBackupData(appDb)
			const backupJson = JSON.stringify(payload, null, '\t')
			const blob = new Blob([backupJson], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			anchor.href = url
			anchor.download = `the-pet-game-backup-${timestamp}.json`
			document.body.appendChild(anchor)
			anchor.click()
			document.body.removeChild(anchor)
			URL.revokeObjectURL(url)
			setStatusMessage('Export complete. Backup JSON downloaded.')
		} catch (err: unknown) {
			logAppError('ProfilesPage.handleExportData', err)
			setMutationError('Failed to export data.')
		}
	}

	const handleImportData = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) {
			return
		}

		const confirmed = window.confirm(
			'Import will overwrite all local data on this device. Continue?',
		)
		if (!confirmed) {
			return
		}

		setIsImporting(true)
		try {
			setMutationError(null)
			setStatusMessage(null)
			const text = await file.text()
			const parsed = parseBackupPayload(JSON.parse(text) as unknown)
			await importBackupData(appDb, parsed)
			window.location.reload()
		} catch (err: unknown) {
			logAppError('ProfilesPage.handleImportData', err)
			setMutationError('Failed to import data. Check the backup file and try again.')
		} finally {
			setIsImporting(false)
		}
	}

	return (
		<section className="panel">
			<h2>Profiles</h2>
			<p>Each profile has separate pets, inventory, and wallet balances on this device.</p>
			<p>Admin tools are available in the `Admin` tab.</p>

			<div className="profiles-backup-row">
				<button type="button" onClick={handleExportData}>
					Export Data
				</button>
				<label className="profiles-import-label">
					<span>Import Data</span>
					<input
						type="file"
						accept="application/json"
						onChange={handleImportData}
						disabled={isImporting}
						aria-label="Import Data"
					/>
				</label>
			</div>
			<p className="profiles-helper-text">
				Import overwrites all local data on this device. Export first before changing icons or reinstalling.
			</p>

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
			{statusMessage ? <p className="profiles-status">{statusMessage}</p> : null}

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
