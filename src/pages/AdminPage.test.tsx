import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { logAppError } from '../utils'

describe('Admin page', () => {
	it('adds a custom store item and shows it in Store', async () => {
		window.location.hash = '#/admin'
		const user = userEvent.setup()
		render(<App />)

		expect(await screen.findByRole('heading', { level: 2, name: 'Admin' })).toBeInTheDocument()
		expect(await screen.findByRole('heading', { level: 3, name: 'Store Item Manager' })).toBeInTheDocument()
		await user.type(screen.getByPlaceholderText('Item name'), 'Hamster Wheel')
		await user.type(screen.getByPlaceholderText('Item description'), 'Wheel for small pets')
		await user.clear(screen.getByLabelText('Store item price'))
		await user.type(screen.getByLabelText('Store item price'), '7')
		await user.type(screen.getByPlaceholderText('toy, cat, favorite'), 'toy, hamster')
		await user.click(screen.getByRole('button', { name: 'Add Store Item' }))

		expect(await screen.findByText('Added "Hamster Wheel".')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Store' }))
		expect(await screen.findByRole('heading', { level: 2, name: 'Store' })).toBeInTheDocument()
		expect(await screen.findByRole('heading', { level: 3, name: 'Hamster Wheel' })).toBeInTheDocument()
	}, 15_000)

	it('shows and clears diagnostics error history', async () => {
		window.location.hash = '#/admin'
		const user = userEvent.setup()
		logAppError('AdminPage.test', new Error('Synthetic diagnostics error'))
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
		render(<App />)

		expect(await screen.findByRole('heading', { level: 3, name: 'Diagnostics: Recent Errors' })).toBeInTheDocument()
		expect(await screen.findByText('Synthetic diagnostics error')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Clear Error Log' }))

		await waitFor(() => {
			expect(screen.getByText('No recent errors logged.')).toBeInTheDocument()
		})

		confirmSpy.mockRestore()
	})
})
