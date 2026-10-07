import { test, expect } from '@playwright/test'

test('home page shows hero copy and the video below the hero', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero')).toBeVisible()
  await expect(page.locator('.hero-text h1')).toHaveText('Climbing Sticks')
  await expect(page.locator('.hero-overlay-cta h2')).toContainText('Lightest.')
  await expect(page.locator('.video-feature')).toBeVisible()

  const heroBottom = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().bottom)
  const videoTop = await page.locator('.video-feature').evaluate((el) => el.getBoundingClientRect().top)
  expect(videoTop).toBeGreaterThanOrEqual(heroBottom)

  const video = page.locator('.video-feature-video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).not.toHaveAttribute('autoplay', '')
  await expect(video).not.toHaveAttribute('muted', '')
  await expect(video).toHaveAttribute('src', '/assets/videos/hero.mp4')
})

test('checkout page loads', async ({ page }) => {
  await page.goto('/checkout.html?pack=2')
  await expect(page.locator('.checkout-section')).toBeVisible()
})

test('404 page shows', async ({ page }) => {
  const response = await page.goto('/nonexistent')
  expect(response?.status()).toBe(404)
})
