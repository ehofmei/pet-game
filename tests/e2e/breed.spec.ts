import { expect, test } from '@playwright/test'

test.describe('Breeding flow', () => {
	test('breeds two pets with coin fallback and opens baby edit', async ({ page }) => {
		await page.goto('/#/pets')
		await expect(page.getByRole('heading', { level: 2, name: 'Pets' })).toBeVisible()

		await page.getByRole('button', { name: 'Add Pet' }).click()
		await page.getByPlaceholder('Pet name').fill('Luna')
		await page.getByLabel('Species').selectOption('cat')
		await page.getByLabel('Gender').selectOption('female')
		await page.getByLabel('Tags').fill('cat, starter')
		await page.getByRole('button', { name: 'Save Pet' }).click()
		await page.getByRole('button', { name: 'Back to Pets' }).click()

		await page.getByRole('button', { name: 'Add Pet' }).click()
		await page.getByPlaceholder('Pet name').fill('Rex')
		await page.getByLabel('Species').selectOption('dog')
		await page.getByLabel('Gender').selectOption('male')
		await page.getByLabel('Tags').fill('dog, starter')
		await page.getByRole('button', { name: 'Save Pet' }).click()
		await page.getByRole('button', { name: 'Back to Pets' }).click()

		await page.getByRole('button', { name: 'Inventory' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Inventory' })).toBeVisible()
		await page.getByLabel('Coins change', { exact: true }).fill('20')
		await page.getByLabel('Wallet adjustment reason').fill('E2E breeding funds')
		await page.getByRole('button', { name: 'Apply Wallet Adjustment' }).click()
		await expect(page.locator('.wallet-balance-card')).toContainText('Coins: 20')

		await page.getByRole('button', { name: 'Breed' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Breed' })).toBeVisible()
		await page.getByRole('button', { name: 'Select Luna' }).click()
		await page.getByRole('button', { name: 'Select Rex' }).click()

		page.once('dialog', (dialog) => dialog.accept())
		await page.getByRole('button', { name: 'Breed Pets' }).click()

		await expect(page.getByRole('heading', { level: 3, name: 'Breeding Success' })).toBeVisible()
		await expect(page.getByText('Breeding complete. Baby of Luna + Rex was added to Pets.')).toBeVisible()
		await page.getByRole('button', { name: 'Add Baby Photo Now' }).click()

		await expect(page.getByRole('heading', { level: 2, name: 'Edit Pet' })).toBeVisible()
		await expect(page.getByLabel('Name')).toHaveValue('Baby of Luna + Rex')
	})
})
