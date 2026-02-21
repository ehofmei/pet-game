import { expect, test } from '@playwright/test'

test.describe('Pets management', () => {
	test('creates pet with photo and filters list', async ({ page }) => {
		await page.goto('/#/pets')

		await expect(page.getByRole('heading', { level: 2, name: 'Pets' })).toBeVisible()
		await page.getByRole('button', { name: 'Add Pet' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Add Pet' })).toBeVisible()

		await page.getByPlaceholder('Pet name').fill('Muffin')
		await page.getByLabel('Species').selectOption('cat')
		await page.getByLabel('Gender').selectOption('female')
		await page.getByLabel('Tags').fill('tiny, playful')
		await page.getByLabel('Breed Count').fill('1')
		await page
			.getByLabel('Pet photo')
			.setInputFiles({ name: 'muffin.png', mimeType: 'image/png', buffer: Buffer.from('pet-photo') })

		await page.getByRole('button', { name: 'Save Pet' }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Muffin' })).toBeVisible()

		await page.getByRole('button', { name: 'Back to Pets' }).click()
		await expect(page.getByText('Muffin')).toBeVisible()

		await page.getByLabel('Filter species').selectOption('dog')
		await expect(page.getByText('No pets match current filters.')).toBeVisible()
	})
})
