import { test, expect } from '@playwright/test'

const CHECKOUT_URL = '/checkout.html?pack=2'

async function isStripeTestMode(page) {
  return page.evaluate(async () => {
    const mod = await import('/assets/js/checkout.js')
    return mod.STRIPE_PK.startsWith('pk_test_')
  })
}

async function waitForCheckout(page) {
  await page.goto(CHECKOUT_URL)
  await expect(page.locator('#cartPrice')).not.toHaveClass(/loading-shimmer/, { timeout: 15000 })
  await expect(page.locator('#stripe-payment-element iframe')).toBeVisible({ timeout: 15000 })
}

async function fillShippingForm(page) {
  await page.fill('#email', 'test@example.com')
  await page.fill('#ship-name', 'John Hunter')
  await page.fill('#ship-address', '123 Main St')
  await page.fill('#ship-city', 'Huntington')
  await page.fill('#ship-state', 'WV')
  await page.fill('#ship-zip', '25701')
}

function stripeFrame(page) {
  return page.frameLocator('#stripe-payment-element iframe')
}

async function fillCard(page, cardNumber, expiry = '1234', cvc = '123') {
  await stripeFrame(page).getByPlaceholder(/1234 1234 1234 1234/).fill(cardNumber)
  await stripeFrame(page).getByPlaceholder(/MM.*YY/).fill(expiry)
  await stripeFrame(page).getByPlaceholder(/CVC/).fill(cvc)
}

// Stripe's PaymentElement intercepts synthetic clicks, so submit programmatically
async function submitForm(page) {
  await page.evaluate(() => {
    document.getElementById('checkoutForm')
      .dispatchEvent(new Event('submit', { cancelable: true }))
  })
}

test.describe('checkout form validation', () => {
  test('shows error when email is missing', async ({ page }) => {
    await waitForCheckout(page)
    await fillShippingForm(page)
    await page.fill('#email', '')
    await submitForm(page)
    await expect(page.locator('#paymentError')).toContainText('valid email')
  })

  test('shows error when shipping fields are missing', async ({ page }) => {
    await waitForCheckout(page)
    await page.fill('#email', 'test@example.com')
    await submitForm(page)
    await expect(page.locator('#paymentError')).toContainText('shipping')
  })
})

test.describe('Stripe test cards', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCheckout(page)
    test.skip(!(await isStripeTestMode(page)), 'Requires Stripe pk_test_ key')
    await fillShippingForm(page)
  })

  test('4242424242424242 — succeeds with no 3DS', async ({ page }) => {
    await fillCard(page, '4242424242424242')
    await submitForm(page)
    await expect(page.locator('text=Payment Confirmed')).toBeVisible({ timeout: 15000 })
  })

  test('4000000000000002 — shows card declined error inside Stripe iframe', async ({ page }) => {
    await fillCard(page, '4000000000000002')
    await submitForm(page)
    await expect(stripeFrame(page).getByText(/declined/i)).toBeVisible({ timeout: 15000 })
  })

  test('4000000000009995 — shows insufficient funds error inside Stripe iframe', async ({ page }) => {
    await fillCard(page, '4000000000009995')
    await submitForm(page)
    await expect(stripeFrame(page).getByText(/insufficient/i)).toBeVisible({ timeout: 15000 })
  })

  // 3DS challenge tests require deeper investigation into Stripe's nested iframe interaction.
  // They complete the challenge via the API but the confirmPayment promise handling needs work.
})
