import { expect, test } from '@playwright/test'

test.describe('Profiles management', () => {
	test('creates and switches profiles', async ({ page }) => {
		await page.goto('/#/profiles')

		await expect(page.getByRole('heading', { level: 2, name: 'Profiles' })).toBeVisible()
		await expect(page.getByText('Family')).toBeVisible()

		await page.getByPlaceholder('New profile name').fill('Kid')
		await page.getByRole('button', { name: 'Add Profile' }).click()

		await expect(page.getByRole('heading', { name: 'Kid' })).toBeVisible()
		await expect(page.getByText('Active Profile: Kid')).toBeVisible()

		await page.getByRole('button', { name: 'Set Active Family' }).click()
		await expect(page.getByText('Active Profile: Family')).toBeVisible()

		await page.getByRole('button', { name: 'Pets' }).click()
		await expect(page.getByText('Showing pets for profile: Family')).toBeVisible()
	})
})
