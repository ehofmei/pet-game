import { useEffect, useMemo, useState } from 'react'
import type { PetGender, PetSpecies } from '../models'

export type PetFormValues = {
	name: string
	species: PetSpecies
	gender: PetGender
	wasWild: boolean
	tagsText: string
	breedCount: number
	notes: string
	photoFile: File | null
}

type PetFormProps = {
	mode: 'create' | 'edit'
	initialValues?: Partial<Omit<PetFormValues, 'photoFile'>>
	existingPhotoUrl?: string | null
	submitLabel: string
	isSubmitting?: boolean
	onCancel: () => void
	onSubmit: (values: PetFormValues) => Promise<void>
}

const SPECIES_OPTIONS: PetSpecies[] = ['cat', 'dog', 'bird', 'bunny', 'other', 'mixed']
const GENDER_OPTIONS: PetGender[] = ['female', 'male', 'unknown']

export const PetForm = ({
	mode,
	initialValues,
	existingPhotoUrl = null,
	submitLabel,
	isSubmitting = false,
	onCancel,
	onSubmit,
}: PetFormProps) => {
	const [name, setName] = useState(initialValues?.name ?? '')
	const [species, setSpecies] = useState<PetSpecies>(initialValues?.species ?? 'cat')
	const [gender, setGender] = useState<PetGender>(initialValues?.gender ?? 'unknown')
	const [wasWild, setWasWild] = useState(initialValues?.wasWild ?? false)
	const [tagsText, setTagsText] = useState(initialValues?.tagsText ?? '')
	const [breedCountText, setBreedCountText] = useState(String(initialValues?.breedCount ?? 0))
	const [notes, setNotes] = useState(initialValues?.notes ?? '')
	const [photoFile, setPhotoFile] = useState<File | null>(null)
	const [formError, setFormError] = useState<string | null>(null)

	const selectedPhotoUrl = useMemo(() => {
		if (!photoFile) {
			return null
		}
		return URL.createObjectURL(photoFile)
	}, [photoFile])

	useEffect(() => {
		return () => {
			if (selectedPhotoUrl) {
				URL.revokeObjectURL(selectedPhotoUrl)
			}
		}
	}, [selectedPhotoUrl])

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const parsedBreedCount = Number.parseInt(breedCountText, 10)
		const safeBreedCount = Number.isNaN(parsedBreedCount) ? 0 : Math.max(0, parsedBreedCount)

		if (!name.trim()) {
			setFormError('Name is required.')
			return
		}

		setFormError(null)
		await onSubmit({
			name,
			species,
			gender,
			wasWild,
			tagsText,
			breedCount: safeBreedCount,
			notes,
			photoFile,
		})
	}

	return (
		<form className="pets-form" onSubmit={handleSubmit}>
			<div className="pets-form-grid">
				<label className="pets-field">
					<span>Name</span>
					<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Pet name" />
				</label>

				<label className="pets-field">
					<span>Species</span>
					<select
						value={species}
						onChange={(event) => setSpecies(event.target.value as PetSpecies)}
						aria-label="Species"
					>
						{SPECIES_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</label>

				<label className="pets-field">
					<span>Gender</span>
					<select value={gender} onChange={(event) => setGender(event.target.value as PetGender)} aria-label="Gender">
						{GENDER_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</label>

				<label className="pets-field">
					<span>Breed Count</span>
					<input
						type="number"
						min={0}
						value={breedCountText}
						onChange={(event) => setBreedCountText(event.target.value)}
						aria-label="Breed Count"
					/>
				</label>

				<label className="pets-field pets-field-toggle">
					<input
						type="checkbox"
						checked={wasWild}
						onChange={(event) => setWasWild(event.target.checked)}
						aria-label="Was wild before adopted"
					/>
					<span>Was wild before adopted</span>
				</label>

				<label className="pets-field">
					<span>Tags (comma-separated)</span>
					<input
						value={tagsText}
						onChange={(event) => setTagsText(event.target.value)}
						placeholder="white, playful, striped"
						aria-label="Tags"
					/>
				</label>

				<label className="pets-field pets-field-wide">
					<span>Notes</span>
					<textarea
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						placeholder="Optional notes"
						rows={3}
						aria-label="Notes"
					/>
				</label>

				<label className="pets-field pets-field-wide">
					<span>Pet photo</span>
					<input
						type="file"
						accept="image/*"
						capture="environment"
						onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
						aria-label="Pet photo"
					/>
				</label>
			</div>

			{selectedPhotoUrl || existingPhotoUrl ? (
				<div className="pets-photo-preview">
					<img src={selectedPhotoUrl ?? existingPhotoUrl ?? ''} alt="Pet preview" />
				</div>
			) : null}

			{formError ? <p className="pets-error">{formError}</p> : null}

			<div className="pets-form-actions">
				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : submitLabel}
				</button>
				<button type="button" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</button>
			</div>

			{mode === 'edit' ? (
				<p className="pets-helper-text">Leave photo empty to keep current photo.</p>
			) : (
				<p className="pets-helper-text">On iPad, this can open the camera when adding a photo.</p>
			)}
		</form>
	)
}
