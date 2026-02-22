import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

const addPet = async ({
	user,
	name,
	species,
	breedCount,
}: {
	user: ReturnType<typeof userEvent.setup>
	name: string
	species: 'cat' | 'dog'
	breedCount?: number
}) => {
	await user.click(await screen.findByRole('button', { name: 'Add Pet' }))
	await screen.findByRole('heading', { level: 2, name: 'Add Pet' })
	await user.type(screen.getByPlaceholderText('Pet name'), name)
	await user.selectOptions(screen.getByLabelText('Species'), species)
	await user.selectOptions(screen.getByLabelText('Gender'), 'female')
	await user.type(screen.getByLabelText('Tags'), `${species}, starter`)
	await user.clear(screen.getByLabelText('Breed Count'))
	await user.type(screen.getByLabelText('Breed Count'), String(breedCount ?? 0))
	await user.click(screen.getByRole('button', { name: 'Save Pet' }))
	await screen.findByRole('heading', { level: 2, name })
	await user.click(screen.getByRole('button', { name: 'Back to Pets' }))
}

describe('Breed page', () => {
	it('breeds two pets with coin fallback and opens baby edit flow', async () => {
		window.location.hash = '#/pets'
		const user = userEvent.setup()
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Pets' })
		await addPet({ user, name: 'Luna', species: 'cat' })
		await addPet({ user, name: 'Rex', species: 'dog' })

		await user.click(screen.getByRole('button', { name: 'Admin' }))
		await screen.findByRole('heading', { level: 2, name: 'Admin' })
		await user.clear(screen.getByLabelText('Admin Coins change'))
		await user.type(screen.getByLabelText('Admin Coins change'), '50')
		await user.type(screen.getByLabelText('Admin wallet reason'), 'Setup breeding funds')
		await user.click(screen.getByRole('button', { name: 'Apply Wallet Update' }))
		await screen.findByText('Wallet updated.')

		await user.click(screen.getByRole('button', { name: 'Breed' }))
		await screen.findByRole('heading', { level: 2, name: 'Breed' })
		await screen.findByText('Showing 2 of 2 pets for selection')
		await user.click(screen.getByRole('button', { name: 'Select Luna' }))
		await user.click(screen.getByRole('button', { name: 'Select Rex' }))
		await user.selectOptions(screen.getByLabelText('Child count'), '2')
		await user.click(screen.getByLabelText('Special Breed'))
		await user.type(screen.getByLabelText('Theme tags'), 'hearts')
		await user.click(screen.getByRole('button', { name: 'Breed Pets' }))

		expect(await screen.findByRole('heading', { level: 3, name: 'Breeding Success' })).toBeInTheDocument()
		expect(screen.getByText('Breeding complete. 2 children added to Pets.')).toBeInTheDocument()

		const addPhotoButtons = screen.getAllByRole('button', { name: /Add Photo for/i })
		await user.click(addPhotoButtons[0]!)
		expect(await screen.findByRole('heading', { level: 2, name: 'Edit Pet' })).toBeInTheDocument()
	}, 20_000)

	it('requires an Extra Breed Card for parents at 5+ breeds', async () => {
		window.location.hash = '#/pets'
		const user = userEvent.setup()
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Pets' })
		await addPet({ user, name: 'Veteran', species: 'cat', breedCount: 5 })
		await addPet({ user, name: 'Comet', species: 'dog', breedCount: 0 })

		await user.click(screen.getByRole('button', { name: 'Admin' }))
		await screen.findByRole('heading', { level: 2, name: 'Admin' })
		await user.clear(screen.getByLabelText('Admin Coins change'))
		await user.type(screen.getByLabelText('Admin Coins change'), '50')
		await user.type(screen.getByLabelText('Admin wallet reason'), 'Setup breeding funds')
		await user.click(screen.getByRole('button', { name: 'Apply Wallet Update' }))
		await screen.findByText('Wallet updated.')

		await user.click(screen.getByRole('button', { name: 'Breed' }))
		await screen.findByRole('heading', { level: 2, name: 'Breed' })
		await user.click(screen.getByRole('button', { name: 'Select Veteran' }))
		await user.click(screen.getByRole('button', { name: 'Select Comet' }))

		expect(screen.getByText(/needs an Extra Breed Card/i)).toBeInTheDocument()
		expect(screen.getByText(/No Extra Breed Cards in inventory/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Breed Pets' })).toBeDisabled()
	}, 20_000)
})
