import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
	it('renders the app title and all primary tabs', async () => {
		render(<App />)

		expect(screen.getByRole('heading', { level: 1, name: 'Pet Breeder Cards' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Pets' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Breed' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Store' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Inventory' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Profiles' })).toBeInTheDocument()
		expect(await screen.findByRole('heading', { level: 2, name: 'Pets' })).toBeInTheDocument()
		expect(await screen.findByText('Active Profile: Family')).toBeInTheDocument()
	})

	it('uses hash route tab on initial load', async () => {
		window.location.hash = '#/inventory'
		render(<App />)

		expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeInTheDocument()
		expect(window.location.hash).toBe('#/inventory')
	})

	it('switches tabs and updates hash when a tab is clicked', async () => {
		const user = userEvent.setup()
		render(<App />)
		await screen.findByRole('heading', { level: 2, name: 'Pets' })

		await user.click(screen.getByRole('button', { name: 'Store' }))

		expect(screen.getByRole('heading', { level: 2, name: 'Store' })).toBeInTheDocument()
		expect(screen.getByText(/Store catalog, purchase flows, and pricing checks/i)).toBeInTheDocument()
		expect(window.location.hash).toBe('#/store')
	})
})
