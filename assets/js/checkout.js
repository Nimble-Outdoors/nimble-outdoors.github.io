export const WORKER_URL = 'https://nimble-stripe.joey-956.workers.dev'
export const STRIPE_PK = 'pk_test_51TmefYPQzgCkAZkTEqMOAk74sX4NRbrxugEyFFmYPlqqUCvppbFxXz3RTNCvS1ii06Z5rfti3noJO3slzAjPsDQ100YB8gqoXx'

export const PACK_DETAILS = [
  { sku: "pack-3", name: "3-Pack", weight: "2 lb 7 oz", sticks: 3, climb: "~12 ft", desc: "Lightest setup. Perfect for run-and-gun hunts." },
  { sku: "pack-4", name: "4-Pack", weight: "3 lb 4 oz", sticks: 4, climb: "~16 ft", desc: "The sweet spot. Enough height for most setups." },
  { sku: "pack-5", name: "5-Pack", weight: "4 lb 1 oz", sticks: 5, climb: "~20 ft", desc: "Maximum reach. For hunters who want every option." },
]

export function getSpecsHtml(pack) {
  return [
    `<li><strong>${pack.sticks}</strong> carbon fiber sticks</li>`,
    `<li><strong>${pack.weight}</strong> total weight</li>`,
    `<li><strong>${pack.climb}</strong> climb height</li>`,
    `<li>Daisy chain rope attachment</li>`,
    `<li>Made in Osseo, Wisconsin</li>`,
  ].join('')
}

export function renderStickIcons(container, count, className) {
  container.innerHTML = ''
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    s.className = className
    container.appendChild(s)
  }
}

export function getConfirmPaymentOutcome(confirmResult) {
  if (confirmResult.error) {
    return { type: 'error', message: confirmResult.error.message }
  }
  if (confirmResult.paymentIntent && confirmResult.paymentIntent.status === 'succeeded') {
    return { type: 'success' }
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
      colorPrimary: '#1F3D1B',
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
      `<p style="color:#ccc;margin:0">Your preorder has been placed. You'll receive a receipt at ${email}.</p>` +
    '</div>'
}

export function setSubmitButton(submitBtn, pack, discount) {
  var price = discount ? pack.price - discount.amount : pack.price;
  submitBtn.textContent = `Pay $${price.toFixed(2)}`
  submitBtn.disabled = false
}

export async function initCheckout(packIndex, email, promoCode) {
  const response = await fetch(`${WORKER_URL}/api/init-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packIndex,
      email: email || undefined,
      promoCode: promoCode || undefined,
    }),
  })
  if (!response.ok) {
    const errData = await response.json()
    throw new Error(errData.error || 'Failed to initialize checkout')
  }
  const data = await response.json()
  return data
}

export function showError(resultEl, message) {
  resultEl.innerHTML = `<p style="color:#ff6b6b;margin:0 0 1rem">${message}</p>`
}
