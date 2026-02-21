import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('Store and inventory flows', () => {
	it('adjusts wallet, buys a store item, and shows it in inventory', async () => {
		window.location.hash = '#/inventory'
		const user = userEvent.setup()
		render(<App />)

		expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeInTheDocument()
		expect(await screen.findByText('Profile: Family')).toBeInTheDocument()

		await user.clear(screen.getByLabelText('Coins change'))
		await user.type(screen.getByLabelText('Coins change'), '20')
		await user.type(screen.getByLabelText('Wallet adjustment reason'), 'Seed test funds')
		await user.click(screen.getByRole('button', { name: 'Apply Wallet Adjustment' }))
		expect(await screen.findByText('Wallet adjusted and logged.')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Store' }))
		expect(await screen.findByRole('heading', { level: 2, name: 'Store' })).toBeInTheDocument()

		const toyHeading = await screen.findByRole('heading', { level: 3, name: 'Toy (Any Species)' })
		const toyCard = toyHeading.closest('li')
		if (!toyCard) {
			throw new Error('Expected Toy (Any Species) card to be present.')
		}
		await user.click(within(toyCard).getByRole('button', { name: 'Buy Toy (Any Species)' }))
		expect(await screen.findByText('Purchased "Toy (Any Species)" and added to Inventory.')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Inventory' }))
		expect(await screen.findByRole('heading', { level: 2, name: 'Inventory' })).toBeInTheDocument()
		expect(await screen.findByRole('heading', { level: 3, name: 'Toy (Any Species)' })).toBeInTheDocument()
	})
})
