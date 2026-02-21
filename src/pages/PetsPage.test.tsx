import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

const addPetThroughForm = async ({
	user,
	name,
	species,
	tags,
}: {
	user: ReturnType<typeof userEvent.setup>
	name: string
	species: 'cat' | 'dog'
	tags?: string
}) => {
	await user.click(await screen.findByRole('button', { name: 'Add Pet' }))
	await screen.findByRole('heading', { level: 2, name: 'Add Pet' })

	await user.type(screen.getByPlaceholderText('Pet name'), name)
	await user.selectOptions(screen.getByLabelText('Species'), species)
	await user.selectOptions(screen.getByLabelText('Gender'), 'female')
	await user.type(screen.getByLabelText('Tags'), tags ?? 'friendly, fluffy')
	await user.clear(screen.getByLabelText('Breed Count'))
	await user.type(screen.getByLabelText('Breed Count'), '2')

	const file = new File(['pet-image'], `${name}.png`, { type: 'image/png' })
	await user.upload(screen.getByLabelText('Pet photo'), file)

	await user.click(screen.getByRole('button', { name: 'Save Pet' }))
}

describe('Pets page', () => {
	it('creates a pet with photo and opens detail view', async () => {
		window.location.hash = '#/pets'
		const user = userEvent.setup()
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Pets' })
		await addPetThroughForm({
			user,
			name: 'Fluffy',
			species: 'cat',
			tags: 'friendly, fluffy',
		})

		expect(await screen.findByRole('heading', { level: 2, name: 'Fluffy' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '+1' })).toBeInTheDocument()
		expect(screen.getByText('No breeding history yet.')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Back to Pets' }))
		expect(await screen.findByText('Showing 1 of 1 pets')).toBeInTheDocument()
		expect(screen.getByText('Fluffy')).toBeInTheDocument()
	})

	it('filters pets by species and search text', async () => {
		window.location.hash = '#/pets'
		const user = userEvent.setup()
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Pets' })
		await addPetThroughForm({ user, name: 'Fluffy', species: 'cat', tags: 'fluffy, sleepy' })
		await user.click(screen.getByRole('button', { name: 'Back to Pets' }))
		await addPetThroughForm({ user, name: 'Rex', species: 'dog', tags: 'guard, brave' })
		await user.click(screen.getByRole('button', { name: 'Back to Pets' }))

		await user.selectOptions(screen.getByLabelText('Filter species'), 'dog')
		expect(screen.getByText('Rex')).toBeInTheDocument()
		expect(screen.queryByText('Fluffy')).not.toBeInTheDocument()

		await user.selectOptions(screen.getByLabelText('Filter species'), 'all')
		await user.clear(screen.getByLabelText('Search pets'))
		await user.type(screen.getByLabelText('Search pets'), 'fluffy')
		await waitFor(() => {
			expect(screen.getByText('Fluffy')).toBeInTheDocument()
			expect(screen.queryByText('Rex')).not.toBeInTheDocument()
		})
	})
})
