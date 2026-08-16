import { expect, test } from '@playwright/test'

test('removes the one-time shell recovery marker after the app mounts', async ({ page }) => {
  await page.goto('/?source=recovery&__catsky_reload=123#recovered')

  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page).toHaveURL(/\/?source=recovery#recovered$/)
})
