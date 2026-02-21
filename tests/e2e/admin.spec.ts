import { expect, test } from '@playwright/test'

test.describe('Admin tools', () => {
	test('adds a custom store item from Admin and shows it in Store', async ({ page }) => {
		await page.goto('/#/admin')

		await expect(page.getByRole('heading', { level: 2, name: 'Admin' })).toBeVisible()
		await page.getByPlaceholder('Item name').fill('Hamster Wheel')
		await page.getByPlaceholder('Item description').fill('Wheel for small pets')
		await page.getByLabel('Store item price').fill('7')
		await page.getByPlaceholder('toy, cat, favorite').fill('toy, hamster')
		await page.getByRole('button', { name: 'Add Store Item' }).click()

		await expect(page.getByText('Added "Hamster Wheel".')).toBeVisible()
		await expect(page.getByRole('heading', { level: 3, name: 'Hamster Wheel' })).toBeVisible()

		await page.getByRole('button', { name: 'Store', exact: true }).click()
		await expect(page.getByRole('heading', { level: 2, name: 'Store' })).toBeVisible()
		await expect(page.getByRole('heading', { level: 3, name: 'Hamster Wheel' })).toBeVisible()
	})
})
