import { test, expect } from '@playwright/test'

test('home page loads with hero section', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero')).toBeVisible()
  await expect(page.locator('.hero-text h1')).toContainText('Nimble Climbing Sticks')
})

test('home page hero subtitle renders from front matter', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero-text p')).toContainText('For The Mobile Hunter')
})

test('home page has pack selector section', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.shop-c-selector')).toBeVisible()
})

test('checkout page loads and shows the correct pack', async ({ page }) => {
  await page.goto('/checkout.html?pack=2')
  await expect(page.locator('.checkout-section')).toBeVisible()
  // Wait for prices to load from the Worker
  await expect(page.locator('#cartPrice')).not.toContainText('loading', { timeout: 10000 })
  await expect(page.locator('#cartName')).toContainText('Nimble Climbing Sticks')
})

test('404 page shows', async ({ page }) => {
  const response = await page.goto('/nonexistent')
  expect(response?.status()).toBe(404)
})
