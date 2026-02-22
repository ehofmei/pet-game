import { expect, test } from '@playwright/test'

test.describe('Store and inventory economy flow', () => {
	test('funds wallet from Admin, buys an item, and adjusts inventory quantity', async ({ page }) => {
		await page.goto('/#/admin')
		await expect(page.getByRole('heading', { level: 2, name: 'Admin' })).toBeVisible()
		await expect(page.getByText('Active Profile: Family')).toBeVisible()

		await page.getByLabel('Admin Coins change', { exact: true }).fill('20')
		await page.getByLabel('Admin wallet reason').fill('E2E seed funds')
		await page.getByRole('button', { name: 'Apply Wallet Update' }).click()
		await expect(page.locator('.wallet-balance-card')).toContainText('Coins: 20')

		await page.getByRole('button', { name: 'Store', exact: true }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Store' })).toBeVisible()

		const toyCard = page
			.locator('li')
			.filter({ has: page.getByRole('heading', { name: 'Toy (Any Species)' }) })
		await toyCard.getByRole('button', { name: 'Buy' }).click()
		await expect(page.getByText('Purchased "Toy (Any Species)" and added to Inventory.')).toBeVisible()

		await page.getByRole('button', { name: 'Inventory' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Inventory' })).toBeVisible()
		await expect(page.getByRole('heading', { level: 3, name: 'Toy (Any Species)' })).toBeVisible()
		await expect(page.getByText('Qty: 1')).toBeVisible()
	})
})
