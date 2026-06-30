export const WORKER_URL = 'https://nimble-stripe.joey-956.workers.dev'
export const STRIPE_PK = 'pk_test_51TmefYPQzgCkAZkTEqMOAk74sX4NRbrxugEyFFmYPlqqUCvppbFxXz3RTNCvS1ii06Z5rfti3noJO3slzAjPsDQ100YB8gqoXx'

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

export function renderSuccessConfirmation(form, email) {
  form.innerHTML =
    '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
      '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
      `<p style="color:#ccc;margin:0">Your preorder has been placed. You'll receive a receipt at ${email}.</p>` +
    '</div>'
}

export function setSubmitButton(submitBtn, pack) {
  submitBtn.textContent = `Pay $${pack.price.toFixed(2)}`
  submitBtn.disabled = false
}

export async function createPaymentIntent(amount, packName, email) {
  const response = await fetch(`${WORKER_URL}/api/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, packName, email: email || undefined }),
  })
  if (!response.ok) {
    const errData = await response.json()
    throw new Error(errData.error || 'Failed to create payment')
  }
  const data = await response.json()
  return data.clientSecret
}

export function showError(resultEl, message) {
  resultEl.innerHTML = `<p style="color:#ff6b6b;margin:0 0 1rem">${message}</p>`
}
