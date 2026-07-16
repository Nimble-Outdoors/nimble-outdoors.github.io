import { test, expect } from '@playwright/test'

test('home page loads with hero section', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero')).toBeVisible()
})

test('checkout page loads', async ({ page }) => {
  await page.goto('/checkout.html?pack=2')
  await expect(page.locator('.checkout-section')).toBeVisible()
})

test('404 page shows', async ({ page }) => {
  const response = await page.goto('/nonexistent')
  expect(response?.status()).toBe(404)
})
