import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabNav, type TabOption } from './TabNav'

type DemoTab = 'pets' | 'store'

const DEMO_TABS: TabOption<DemoTab>[] = [
	{ key: 'pets', label: 'Pets' },
	{ key: 'store', label: 'Store' },
]

describe('TabNav', () => {
	it('marks the active tab with aria-current', () => {
		render(<TabNav tabs={DEMO_TABS} activeTab="pets" onTabChange={vi.fn()} />)

		expect(screen.getByRole('button', { name: 'Pets' })).toHaveAttribute('aria-current', 'page')
		expect(screen.getByRole('button', { name: 'Store' })).not.toHaveAttribute('aria-current')
	})

	it('calls onTabChange for clicked tab', async () => {
		const onTabChange = vi.fn()
		const user = userEvent.setup()
		render(<TabNav tabs={DEMO_TABS} activeTab="pets" onTabChange={onTabChange} />)

		await user.click(screen.getByRole('button', { name: 'Store' }))

		expect(onTabChange).toHaveBeenCalledTimes(1)
		expect(onTabChange).toHaveBeenCalledWith('store')
	})
})
