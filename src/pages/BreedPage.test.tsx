import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

const addPet = async ({
	user,
	name,
	species,
}: {
	user: ReturnType<typeof userEvent.setup>
	name: string
	species: 'cat' | 'dog'
}) => {
	await user.click(await screen.findByRole('button', { name: 'Add Pet' }))
	await screen.findByRole('heading', { level: 2, name: 'Add Pet' })
	await user.type(screen.getByPlaceholderText('Pet name'), name)
	await user.selectOptions(screen.getByLabelText('Species'), species)
	await user.selectOptions(screen.getByLabelText('Gender'), 'female')
	await user.type(screen.getByLabelText('Tags'), `${species}, starter`)
	await user.click(screen.getByRole('button', { name: 'Save Pet' }))
	await screen.findByRole('heading', { level: 2, name })
	await user.click(screen.getByRole('button', { name: 'Back to Pets' }))
}

describe('Breed page', () => {
	it('breeds two pets with coin fallback and opens baby edit flow', async () => {
		window.location.hash = '#/pets'
		const user = userEvent.setup()
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Pets' })
		await addPet({ user, name: 'Luna', species: 'cat' })
		await addPet({ user, name: 'Rex', species: 'dog' })

		await user.click(screen.getByRole('button', { name: 'Inventory' }))
		await screen.findByRole('heading', { level: 2, name: 'Inventory' })
		await user.clear(screen.getByLabelText('Coins change'))
		await user.type(screen.getByLabelText('Coins change'), '20')
		await user.type(screen.getByLabelText('Wallet adjustment reason'), 'Setup breeding funds')
		await user.click(screen.getByRole('button', { name: 'Apply Wallet Adjustment' }))
		await screen.findByText('Wallet adjusted and logged.')

		await user.click(screen.getByRole('button', { name: 'Breed' }))
		await screen.findByRole('heading', { level: 2, name: 'Breed' })
		await screen.findByText('Showing 2 of 2 pets for selection')
		await user.click(screen.getByRole('button', { name: 'Select Luna' }))
		await user.click(screen.getByRole('button', { name: 'Select Rex' }))
		await user.click(screen.getByRole('button', { name: 'Breed Pets' }))

		expect(await screen.findByRole('heading', { level: 3, name: 'Breeding Success' })).toBeInTheDocument()
		expect(screen.getByText('Breeding complete. Baby of Luna + Rex was added to Pets.')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Add Baby Photo Now' }))
		expect(await screen.findByRole('heading', { level: 2, name: 'Edit Pet' })).toBeInTheDocument()

		confirmSpy.mockRestore()
	}, 20_000)
})
