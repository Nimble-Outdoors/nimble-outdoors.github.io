/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getConfirmPaymentOutcome, validateEmail, getShippingFields,
  buildShippingAddress, createPaymentAppearance, createPaymentFields,
  createPaymentFieldsDefault, renderSuccessConfirmation, setSubmitButton,
  createPaymentIntent, showError
} from '../assets/js/payment.js'

describe('getConfirmPaymentOutcome', () => {
  it('returns error when confirmResult has an error', () => {
    const result = getConfirmPaymentOutcome({
      error: { message: 'Your card was declined.' },
    })
    expect(result).toEqual({ type: 'error', message: 'Your card was declined.' })
  })

  it('returns success when paymentIntent status is succeeded', () => {
    const result = getConfirmPaymentOutcome({
      paymentIntent: { status: 'succeeded' },
    })
    expect(result).toEqual({ type: 'success' })
  })

  it('returns requires_action when paymentIntent status is not succeeded', () => {
    const result = getConfirmPaymentOutcome({
      paymentIntent: { status: 'requires_payment_method' },
    })
    expect(result).toEqual({ type: 'requires_action' })
  })

  it('returns requires_action when paymentIntent is pending', () => {
    const result = getConfirmPaymentOutcome({
      paymentIntent: { status: 'processing' },
    })
    expect(result).toEqual({ type: 'requires_action' })
  })

  it('returns requires_action when paymentIntent is null and no error', () => {
    const result = getConfirmPaymentOutcome({})
    expect(result).toEqual({ type: 'requires_action' })
  })
})

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('returns true for email with subdomain', () => {
    expect(validateEmail('user@sub.example.co.uk')).toBe(true)
  })

  it('returns false for missing @', () => {
    expect(validateEmail('notanemail')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('returns false for only domain', () => {
    expect(validateEmail('@example.com')).toBe(false)
  })

  it('returns false for missing domain', () => {
    expect(validateEmail('user@')).toBe(false)
  })
})

describe('getShippingFields', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="text" id="ship-name" value="John Doe" />
      <input type="text" id="ship-address" value="123 Main St" />
      <input type="text" id="ship-address2" value="Apt 4" />
      <input type="text" id="ship-city" value="Eau Claire" />
      <input type="text" id="ship-state" value="WI" />
      <input type="text" id="ship-zip" value="54701" />
    `
  })

  it('returns shipping fields from DOM', () => {
    const fields = getShippingFields()
    expect(fields).toEqual({
      name: 'John Doe',
      address: '123 Main St',
      address2: 'Apt 4',
      city: 'Eau Claire',
      state: 'WI',
      zip: '54701',
    })
  })

  it('returns empty strings when fields are empty', () => {
    document.getElementById('ship-name').value = ''
    document.getElementById('ship-address').value = ''
    document.getElementById('ship-city').value = ''
    document.getElementById('ship-state').value = ''
    document.getElementById('ship-zip').value = ''
    const fields = getShippingFields()
    expect(fields.name).toBe('')
    expect(fields.address).toBe('')
    expect(fields.city).toBe('')
    expect(fields.state).toBe('')
    expect(fields.zip).toBe('')
  })
})

describe('buildShippingAddress', () => {
  it('returns address object with line2 when address2 present', () => {
    const result = buildShippingAddress({
      name: 'John Doe',
      address: '123 Main St',
      address2: 'Apt 4',
      city: 'Eau Claire',
      state: 'WI',
      zip: '54701',
    })
    expect(result).toEqual({
      line1: '123 Main St',
      line2: 'Apt 4',
      city: 'Eau Claire',
      state: 'WI',
      postal_code: '54701',
      country: 'US',
    })
  })

  it('omits line2 when address2 is empty', () => {
    const result = buildShippingAddress({
      name: 'Jane Doe',
      address: '456 Oak Ave',
      address2: '',
      city: 'Osseo',
      state: 'WI',
      zip: '54758',
    })
    expect(result.line1).toBe('456 Oak Ave')
    expect(result.line2).toBeUndefined()
    expect(result.city).toBe('Osseo')
    expect(result.state).toBe('WI')
    expect(result.country).toBe('US')
  })

  it('omits line2 when address2 is null/undefined', () => {
    const result = buildShippingAddress({
      name: 'Jane Doe',
      address: '456 Oak Ave',
      address2: undefined,
      city: 'Osseo',
      state: 'WI',
      zip: '54758',
    })
    expect(result.line2).toBeUndefined()
  })
})

describe('createPaymentAppearance', () => {
  it('returns Stripe appearance config with dark theme', () => {
    const result = createPaymentAppearance()
    expect(result).toEqual({
      theme: 'night',
      variables: {
        colorPrimary: '#1F3D1B',
        colorBackground: '#222222',
        colorText: '#ffffff',
        colorDanger: '#ff6b6b',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '4px',
      },
    })
  })
})

describe('createPaymentFields', () => {
  it('returns fields config hiding all billing details', () => {
    const result = createPaymentFields()
    expect(result.fields.billingDetails).toEqual({
      name: 'never',
      email: 'never',
      phone: 'never',
      address: 'never',
    })
  })

  it('disables wallets and link', () => {
    const result = createPaymentFields()
    expect(result.wallets).toEqual({
      applePay: 'never',
      googlePay: 'never',
      link: 'never',
    })
  })
})

describe('createPaymentFieldsDefault', () => {
  it('returns empty object (Stripe defaults)', () => {
    const result = createPaymentFieldsDefault()
    expect(result).toEqual({})
  })
})

describe('renderSuccessConfirmation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<form id="testForm"></form>'
  })

  it('renders success HTML with checked email', () => {
    const form = document.getElementById('testForm')
    renderSuccessConfirmation(form, 'john@example.com')
    expect(form.innerHTML).toContain('Payment Confirmed')
    expect(form.innerHTML).toContain('john@example.com')
    expect(form.innerHTML).toContain('\u2713')
    expect(form.innerHTML).toContain('#1F3D1B')
    expect(form.innerHTML).not.toContain('#8B0000')
  })
})

describe('setSubmitButton', () => {
  it('sets button text from pack price and enables it', () => {
    document.body.innerHTML = '<button id="btn">Pay $0.00</button>'
    const btn = document.getElementById('btn')
    btn.disabled = true
    setSubmitButton(btn, { price: 299.99 })
    expect(btn.textContent).toBe('Pay $299.99')
    expect(btn.disabled).toBe(false)
  })

  it('formats price with two decimals', () => {
    document.body.innerHTML = '<button id="btn2"></button>'
    const btn = document.getElementById('btn2')
    setSubmitButton(btn, { price: 50 })
    expect(btn.textContent).toBe('Pay $50.00')
  })
})

describe('createPaymentIntent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns clientSecret on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ clientSecret: 'pi_123_secret_abc' }),
    })
    const result = await createPaymentIntent(249.00, '4-Pack', 'test@example.com')
    expect(result).toBe('pi_123_secret_abc')
  })

  it('sends amount, packName, and email in request body', async () => {
    let body = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      body = JSON.parse(opts.body)
      return { ok: true, json: () => Promise.resolve({ clientSecret: 'pi_s' }) }
    })
    await createPaymentIntent(199.99, '3-Pack', 'a@b.com')
    expect(body.amount).toBe(199.99)
    expect(body.packName).toBe('3-Pack')
    expect(body.email).toBe('a@b.com')
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid amount' }),
    })
    await expect(createPaymentIntent(0, 'test')).rejects.toThrow('Invalid amount')
  })

  it('throws on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))
    await expect(createPaymentIntent(50, 'test')).rejects.toThrow('Network failure')
  })
})

describe('showError', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="result"></div>'
  })

  it('injects error message into element', () => {
    const el = document.getElementById('result')
    showError(el, 'Something went wrong')
    expect(el.innerHTML).toContain('Something went wrong')
    expect(el.innerHTML).toContain('#ff6b6b')
  })
})

describe('checkout confirmPayment integration (jsdom)', () => {
  const PACK = { price: 249.00 }

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="checkoutForm">
        <div id="checkoutResults"></div>
        <div id="stripe-payment-element"></div>
        <input type="email" id="email" value="test@example.com" required />
        <div id="shipping-fields">
          <input type="text" id="ship-name" value="John Doe" />
          <input type="text" id="ship-address" value="123 Main St" />
          <input type="text" id="ship-address2" value="Apt 4" />
          <input type="text" id="ship-city" value="Eau Claire" />
          <input type="text" id="ship-state" value="WI" />
          <input type="text" id="ship-zip" value="54701" />
        </div>
        <button type="submit" id="submit-btn">Pay $249.00</button>
      </form>
    `
  })

  it('shows success message and replaces form when payment succeeds', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }),
    }

    const form = document.getElementById('checkoutForm')
    const submitBtn = document.getElementById('submit-btn')
    const resultEl = document.getElementById('checkoutResults')

    const handleSubmit = async (e) => {
      e.preventDefault()
      var fields = getShippingFields()

      try {
        var confirmResult = await globalThis.stripe.confirmPayment({
          elements: {},
          redirect: 'if_required',
          confirmParams: {
            return_url: 'https://nimble-stripe.joey-956.workers.dev/confirm',
            receipt_email: document.getElementById('email').value,
            payment_method_data: {
              billing_details: {
                name: fields.name,
                email: document.getElementById('email').value,
                phone: '',
                address: { line1: fields.address, city: fields.city, state: fields.state, postal_code: fields.zip, country: 'US' },
              },
            },
            shipping: { name: fields.name, address: buildShippingAddress(fields) },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)
        if (outcome.type === 'error') {
          showError(resultEl, outcome.message)
          setSubmitButton(submitBtn, PACK)
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          renderSuccessConfirmation(form, document.getElementById('email').value)
        }
      } catch (err) {
        showError(resultEl, err.message)
        setSubmitButton(submitBtn, PACK)
      }
    }

    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('stripe-payment-element')).toBeNull()
      expect(form.innerHTML).toContain('Payment Confirmed')
      expect(form.innerHTML).toContain('test@example.com')
      expect(form.innerHTML).toContain('#1F3D1B')
    })
  })

  it('shows error and re-enables button when payment fails', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockResolvedValue({ error: { message: 'Your card was declined.' } }),
    }

    const form = document.getElementById('checkoutForm')
    const submitBtn = document.getElementById('submit-btn')
    const resultEl = document.getElementById('checkoutResults')

    const handleSubmit = async (e) => {
      e.preventDefault()
      var fields = getShippingFields()

      try {
        var confirmResult = await globalThis.stripe.confirmPayment({
          elements: {},
          redirect: 'if_required',
          confirmParams: {
            return_url: 'https://nimble-stripe.joey-956.workers.dev/confirm',
            receipt_email: document.getElementById('email').value,
            payment_method_data: {
              billing_details: {
                name: fields.name,
                email: document.getElementById('email').value,
                phone: '',
                address: { line1: fields.address, city: fields.city, state: fields.state, postal_code: fields.zip, country: 'US' },
              },
            },
            shipping: { name: fields.name, address: buildShippingAddress(fields) },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)
        if (outcome.type === 'error') {
          showError(resultEl, outcome.message)
          setSubmitButton(submitBtn, PACK)
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          renderSuccessConfirmation(form, document.getElementById('email').value)
        }
      } catch (err) {
        showError(resultEl, err.message)
        setSubmitButton(submitBtn, PACK)
      }
    }

    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(resultEl.innerHTML).toContain('Your card was declined')
      expect(resultEl.innerHTML).toContain('#ff6b6b')
      expect(submitBtn.disabled).toBe(false)
      expect(submitBtn.textContent).toBe('Pay $249.00')
    })
  })

  it('re-enables button and shows error when confirmPayment throws', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockRejectedValue(new Error('Stripe API error')),
    }

    const form = document.getElementById('checkoutForm')
    const submitBtn = document.getElementById('submit-btn')
    const resultEl = document.getElementById('checkoutResults')

    const handleSubmit = async (e) => {
      e.preventDefault()
      var fields = getShippingFields()

      try {
        var confirmResult = await globalThis.stripe.confirmPayment({
          elements: {},
          redirect: 'if_required',
          confirmParams: {
            return_url: 'https://nimble-stripe.joey-956.workers.dev/confirm',
            receipt_email: document.getElementById('email').value,
            payment_method_data: {
              billing_details: {
                name: fields.name,
                email: document.getElementById('email').value,
                phone: '',
                address: { line1: fields.address, city: fields.city, state: fields.state, postal_code: fields.zip, country: 'US' },
              },
            },
            shipping: { name: fields.name, address: buildShippingAddress(fields) },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)
        if (outcome.type === 'error') {
          showError(resultEl, outcome.message)
          setSubmitButton(submitBtn, PACK)
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          renderSuccessConfirmation(form, document.getElementById('email').value)
        }
      } catch (err) {
        showError(resultEl, err.message)
        setSubmitButton(submitBtn, PACK)
      }
    }

    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(resultEl.innerHTML).toContain('Stripe API error')
      expect(submitBtn.disabled).toBe(false)
      expect(submitBtn.textContent).toBe('Pay $249.00')
    })
  })

  it('does not modify form when requires_action (Stripe handles redirect)', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'requires_action' } }),
    }

    const form = document.getElementById('checkoutForm')
    const resultEl = document.getElementById('checkoutResults')
    const paymentEl = document.getElementById('stripe-payment-element')

    const handleSubmit = async (e) => {
      e.preventDefault()
      var fields = getShippingFields()

      try {
        var confirmResult = await globalThis.stripe.confirmPayment({
          elements: {},
          redirect: 'if_required',
          confirmParams: {
            return_url: 'https://nimble-stripe.joey-956.workers.dev/confirm',
            receipt_email: document.getElementById('email').value,
            payment_method_data: {
              billing_details: {
                name: fields.name,
                email: document.getElementById('email').value,
                phone: '',
                address: { line1: fields.address, city: fields.city, state: fields.state, postal_code: fields.zip, country: 'US' },
              },
            },
            shipping: { name: fields.name, address: buildShippingAddress(fields) },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)
        if (outcome.type === 'error') {
          showError(resultEl, outcome.message)
          setSubmitButton(submitBtn, PACK)
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          renderSuccessConfirmation(form, document.getElementById('email').value)
        }
      } catch (err) {
        showError(resultEl, err.message)
        setSubmitButton(submitBtn, PACK)
      }
    }

    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(resultEl.innerHTML).toBe('')
      expect(paymentEl.innerHTML).toBe('')
      expect(form.innerHTML).not.toContain('Payment Confirmed')
    })
  })
})
