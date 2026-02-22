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

		await page.getByRole('button', { name: 'Admin' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Admin' })).toBeVisible()
		await page.getByLabel('Admin Coins change', { exact: true }).fill('50')
		await page.getByLabel('Admin wallet reason').fill('E2E breeding funds')
		await page.getByRole('button', { name: 'Apply Wallet Update' }).click()
		await expect(page.locator('.wallet-balance-card')).toContainText('Coins: 50')

		await page.getByRole('button', { name: 'Breed', exact: true }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Breed' })).toBeVisible()
		await page.getByRole('button', { name: 'Select Luna' }).click()
		await page.getByRole('button', { name: 'Select Rex' }).click()
		await page.getByLabel('Child count').selectOption('2')
		await page.getByLabel('Special Breed').check()
		await page.getByLabel('Theme tags').fill('hearts')
		await page.getByRole('button', { name: 'Breed Pets' }).click()

		await expect(page.getByRole('heading', { level: 3, name: 'Breeding Success' })).toBeVisible()
		await expect(page.getByText('Breeding complete. 2 children added to Pets.')).toBeVisible()
		await page.getByRole('button', { name: /Add Photo for/ }).first().click()

		await expect(page.getByRole('heading', { level: 2, name: 'Edit Pet' })).toBeVisible()
		await expect(page.getByLabel('Name')).toHaveValue('Baby 1 of Luna + Rex')
	})

	test('requires Extra Breed Card for 5+ breed parents and consumes it', async ({ page }) => {
		await page.goto('/#/pets')
		await expect(page.getByRole('heading', { level: 2, name: 'Pets' })).toBeVisible()

		await page.getByRole('button', { name: 'Add Pet' }).click()
		await page.getByPlaceholder('Pet name').fill('Veteran')
		await page.getByLabel('Species').selectOption('cat')
		await page.getByLabel('Gender').selectOption('female')
		await page.getByLabel('Breed Count').fill('5')
		await page.getByLabel('Tags').fill('cat, veteran')
		await page.getByRole('button', { name: 'Save Pet' }).click()
		await page.getByRole('button', { name: 'Back to Pets' }).click()

		await page.getByRole('button', { name: 'Add Pet' }).click()
		await page.getByPlaceholder('Pet name').fill('Comet')
		await page.getByLabel('Species').selectOption('dog')
		await page.getByLabel('Gender').selectOption('male')
		await page.getByLabel('Breed Count').fill('0')
		await page.getByLabel('Tags').fill('dog, starter')
		await page.getByRole('button', { name: 'Save Pet' }).click()
		await page.getByRole('button', { name: 'Back to Pets' }).click()

		await page.getByRole('button', { name: 'Admin' }).click()
		await page.getByLabel('Admin Coins change', { exact: true }).fill('100')
		await page.getByLabel('Admin wallet reason').fill('E2E extra card funds')
		await page.getByRole('button', { name: 'Apply Wallet Update' }).click()

		await page.getByRole('button', { name: 'Breed', exact: true }).click()
		await page.getByRole('button', { name: 'Select Veteran' }).click()
		await page.getByRole('button', { name: 'Select Comet' }).click()
		await expect(page.getByText(/needs an Extra Breed Card/i)).toBeVisible()
		await expect(page.getByText(/No Extra Breed Cards in inventory/i)).toBeVisible()
		await expect(page.getByRole('button', { name: 'Breed Pets' })).toBeDisabled()

		await page.getByRole('button', { name: 'Store', exact: true }).click()
		const extraCardItem = page.locator('li').filter({ has: page.getByRole('heading', { name: 'Extra Breed Card' }) }).first()
		await extraCardItem.getByRole('button', { name: 'Buy Extra Breed Card' }).click()
		await expect(page.getByText(/Purchased "Extra Breed Card"/i)).toBeVisible()

		await page.getByRole('button', { name: 'Breed', exact: true }).click()
		await page.getByRole('button', { name: 'Select Veteran' }).click()
		await page.getByRole('button', { name: 'Select Comet' }).click()
		await expect(page.getByText('Extra Breed Cards available: 1')).toBeVisible()
		await page.getByLabel('Use Extra Breed Card').check()
		await page.getByRole('button', { name: 'Breed Pets' }).click()

		await expect(page.getByRole('heading', { level: 3, name: 'Breeding Success' })).toBeVisible()
		await expect(page.getByText(/Extra Breed Card Used:\s*Yes/i)).toBeVisible()
	})
})
