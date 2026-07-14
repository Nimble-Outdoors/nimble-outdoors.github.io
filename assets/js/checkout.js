export const WORKER_URL = 'https://nimble-stripe.joey-956.workers.dev'

const TEST_MODE = true
const CHECKOUT_TIMEOUT_MS = 10_000

export const STRIPE_PK = TEST_MODE
  ? 'pk_test_51TmefYPQzgCkAZkTEqMOAk74sX4NRbrxugEyFFmYPlqqUCvppbFxXz3RTNCvS1ii06Z5rfti3noJO3slzAjPsDQ100YB8gqoXx'
  : 'pk_live_51TmefYPQzgCkAZkTnvdVyDKW9EfnkC2NPfPwwC0wNywNIG3uGmUlCcbDDH60LzqSsSDqH6Fi28I1hn3xNvQD3aCQ00jVy3AgG9'

export const IS_TEST_MODE = TEST_MODE

export { getPackDetails } from './pack-details.js'
import { getPackDetails as _getPackDetails } from './pack-details.js'
export { getSpecsHtml, renderStickIcons } from './packs.js'

export function getConfirmPaymentOutcome(confirmResult) {
  if (confirmResult.error) {
    return { type: 'error', message: confirmResult.error.message }
  }
  const pi = confirmResult.paymentIntent
  if (pi?.status === 'succeeded') {
    return { type: 'success' }
  }
  if (pi?.last_payment_error) {
    return { type: 'error', message: pi.last_payment_error.message }
  }
  return { type: 'requires_action' }
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getShippingFields() {
  return {
    name: document.getElementById('ship-name').value,
    address: document.getElementById('ship-address').value,
    address2: document.getElementById('ship-address2').value,
    city: document.getElementById('ship-city').value,
    state: document.getElementById('ship-state').value,
    zip: document.getElementById('ship-zip').value,
  }
}

export function buildShippingAddress(fields) {
  const address = {
    line1: fields.address,
    city: fields.city,
    state: fields.state,
    postal_code: fields.zip,
    country: 'US',
  }
  if (fields.address2) {
    address.line2 = fields.address2
  }
  return address
}

export function createPaymentAppearance() {
  return {
    theme: 'night',
    variables: {
      colorPrimary: '#2E7D32',
      colorBackground: '#222222',
      colorText: '#ffffff',
      colorDanger: '#ff6b6b',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '4px',
    },
  }
}

export function createPaymentFields() {
  return {
    fields: {
      billingDetails: {
        name: 'never',
        email: 'never',
        phone: 'never',
        address: 'never',
      },
    },
    wallets: {
      applePay: 'never',
      googlePay: 'never',
      link: 'never',
    },
  }
}

export function createPaymentFieldsDefault() {
  return {}
}

export function renderSuccessConfirmation(form, email) {
  form.innerHTML =
    '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
      '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
      `<p style="color:#ccc;margin:0">Your order has been placed. You'll receive a receipt at ${email}.</p>` +
    '</div>'
}

export function setSubmitButton(submitBtn, pack, discount) {
  const price = discount ? pack.price - discount.amount : pack.price
  submitBtn.textContent = `Pay $${price.toFixed(2)}`
  submitBtn.disabled = false
}

async function fetchWithTimeout(url, opts, ms) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function initCheckout(packIndex, email, promoCode) {
  const response = await fetchWithTimeout(`${WORKER_URL}/api/init-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packIndex,
      email: email || undefined,
      promoCode: promoCode || undefined,
      mode: TEST_MODE ? 'test' : 'live',
    }),
  }, CHECKOUT_TIMEOUT_MS)
  if (!response.ok) {
    const errData = await response.json()
    throw new Error(errData.error || 'Failed to initialize checkout')
  }
  return response.json()
}

export function mergePackData(apiPacks) {
  const details = _getPackDetails()
  return apiPacks.map(function (p, i) {
    const detail = details[i]
    return detail ? Object.assign({}, detail, p) : p
  })
}

export function showError(resultEl, message) {
  resultEl.innerHTML = `<p style="color:#ff6b6b;margin:0 0 1rem">${message}</p>`
}

export function renderTestModeBanner() {
  if (!IS_TEST_MODE) return
  const banner = document.createElement('div')
  banner.id = 'stripeTestModeBanner'
  banner.style.cssText = 'background:#ff6b6b;color:#fff;text-align:center;padding:10px;font-weight:bold;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px'
  banner.textContent = 'Test Mode — No real charges will be made'
  const section = document.querySelector('.checkout-section')
  if (section) {
    section.insertBefore(banner, section.firstChild)
  }
}
