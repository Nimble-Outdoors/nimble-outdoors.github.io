import { test, expect } from '@playwright/test'

test('signup section has Turnstile widget (invisible mode)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.cf-turnstile')).toBeAttached()
  await expect(page.locator('#waitingListForm')).toBeVisible()
  await expect(page.locator('#sendMessageButton')).toBeVisible()
  await page.waitForSelector('[name="cf-turnstile-response"]', { state: 'attached', timeout: 10000 })
})

test('signup form submission with mocked siteverify', async ({ page }) => {
  await page.route('https://turnstile-siteverify-nimble.joey-956.workers.dev/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('https://formspree.io/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  await page.goto('/')

  // Turnstile creates its own hidden input; overwrite the value with a test token
  await page.waitForSelector('[name="cf-turnstile-response"]', { state: 'attached', timeout: 10000 })
  await page.evaluate(() => {
    document.querySelector('[name="cf-turnstile-response"]').value = 'test_turnstile_token'
  })

  await page.fill('#waitingListForm input[type="email"]', 'test@example.com')
  await page.click('#sendMessageButton')
  await expect(page.locator('#waitingListFormStatus')).toContainText("You're all signed up!")
})

test('signup form shows error when siteverify fails', async ({ page }) => {
  await page.route('https://turnstile-siteverify-nimble.joey-956.workers.dev/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: false }),
    })
  })

  await page.goto('/')

  await page.waitForSelector('[name="cf-turnstile-response"]', { state: 'attached', timeout: 10000 })
  await page.evaluate(() => {
    document.querySelector('[name="cf-turnstile-response"]').value = 'test_turnstile_token'
  })

  await page.fill('#waitingListForm input[type="email"]', 'test@example.com')
  await page.click('#sendMessageButton')
  await expect(page.locator('#waitingListFormStatus')).toContainText('Verification failed')
})
