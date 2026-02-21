import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

describe('Profiles page', () => {
	it('creates a profile and switches active profile', async () => {
		window.location.hash = '#/profiles'
		const user = userEvent.setup()
		render(<App />)

		expect(await screen.findByRole('heading', { level: 2, name: 'Profiles' })).toBeInTheDocument()
		expect(await screen.findByText('Family')).toBeInTheDocument()

		await user.type(screen.getByPlaceholderText('New profile name'), 'Kid')
		await user.click(screen.getByRole('button', { name: 'Add Profile' }))

		expect(await screen.findByText('Kid')).toBeInTheDocument()
		expect(await screen.findByText('Active Profile: Kid')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Set Active Family' }))
		expect(await screen.findByText('Active Profile: Family')).toBeInTheDocument()
	})

	it('prevents deleting the last remaining profile', async () => {
		window.location.hash = '#/profiles'
		render(<App />)

		const deleteFamilyButton = await screen.findByRole('button', { name: 'Delete Family' })
		expect(deleteFamilyButton).toBeDisabled()
	})

	it('deletes a non-last profile after confirmation', async () => {
		window.location.hash = '#/profiles'
		const user = userEvent.setup()
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
		render(<App />)

		await screen.findByRole('heading', { level: 2, name: 'Profiles' })
		await user.type(await screen.findByPlaceholderText('New profile name'), 'Kid')
		await user.click(screen.getByRole('button', { name: 'Add Profile' }))
		await screen.findByText('Kid')

		await user.click(screen.getByRole('button', { name: 'Delete Kid' }))

		await waitFor(() => {
			expect(screen.queryByText('Kid')).not.toBeInTheDocument()
		})

		confirmSpy.mockRestore()
	})
})
