import { expect, test } from '@playwright/test'

test.describe('App shell', () => {
	test('renders core tabs and switches to Store', async ({ page }) => {
		await page.goto('/')

		await expect(page.getByRole('heading', { level: 1, name: 'The Pet Game' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Pets' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Breed' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Store' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Profiles' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible()

		await page.getByRole('button', { name: 'Store' }).click()

		await expect(page.getByRole('heading', { level: 2, name: 'Store' })).toBeVisible()
		await expect(page).toHaveURL(/#\/store$/)
	})

	test('loads correct tab from hash route', async ({ page }) => {
		await page.goto('/#/inventory')
		await expect(page.getByRole('heading', { level: 2, name: 'Inventory' })).toBeVisible()
	})
})
