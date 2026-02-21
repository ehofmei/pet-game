import { expect, test } from '@playwright/test'

test.describe('Store and inventory economy flow', () => {
	test('funds wallet, buys an item, and adjusts inventory quantity', async ({ page }) => {
		await page.goto('/#/inventory')
		await expect(page.getByRole('heading', { level: 2, name: 'Inventory' })).toBeVisible()
		await expect(page.getByText('Profile: Family', { exact: true })).toBeVisible()

		await page.getByLabel('Coins change', { exact: true }).fill('20')
		await page.getByLabel('Wallet adjustment reason').fill('E2E seed funds')
		await page.getByRole('button', { name: 'Apply Wallet Adjustment' }).click()
		await expect(page.locator('.wallet-balance-card')).toContainText('Coins: 20')

		await page.getByRole('button', { name: 'Store' }).click()
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
