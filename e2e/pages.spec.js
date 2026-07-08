import { test, expect } from '@playwright/test'

test('home page loads with hero section', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero')).toBeVisible()
  await expect(page.locator('.hero-title h1')).toContainText('Nimble Climbing Sticks')
})

test('home page transitions from coming-soon to now-available', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#heroSubtitle')).toContainText('Coming soon...')
  await expect(page.locator('.coming-soon-bg')).toBeVisible()

  // Wait for the 2.5s transition
  await page.waitForTimeout(3000)

  await expect(page.locator('#heroSubtitle')).toContainText('Now available')
  await expect(page.locator('.hero.available')).toBeVisible()
})

test('shop page loads with pack selector', async ({ page }) => {
  await page.goto('/shop.html')
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
