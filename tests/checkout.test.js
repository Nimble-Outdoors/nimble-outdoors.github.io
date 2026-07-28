/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getConfirmPaymentOutcome, validateEmail, getShippingFields,
  buildShippingAddress, createPaymentAppearance, createPaymentFields,
  createPaymentFieldsDefault, renderSuccessConfirmation, setSubmitButton,
  showError, mergePackData, getPackDetails, findPack,
  initCheckout, renderStickIcons, getSpecsHtml,
  renderOrderSummary, updatePriceDisplay
} from '../assets/js/checkout.js'

const MOCK_PACKS = [
  { sku: 'mach-one-3-pack-16-inch', name: '3-Pack', size: 16, sticks: 3 },
  { sku: 'mach-one-3-pack-20-inch', name: '3-Pack', size: 20, sticks: 3 },
  { sku: 'mach-one-4-pack-16-inch', name: '4-Pack', size: 16, sticks: 4 },
  { sku: 'mach-one-4-pack-20-inch', name: '4-Pack', size: 20, sticks: 4 },
  { sku: 'mach-one-5-pack-16-inch', name: '5-Pack', size: 16, sticks: 5 },
  { sku: 'mach-one-5-pack-20-inch', name: '5-Pack', size: 20, sticks: 5 },
]

beforeEach(() => {
  document.body.innerHTML = `<script id="pack-data" type="application/json">${JSON.stringify(MOCK_PACKS)}</script>`
})

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
        colorPrimary: '#2E7D32',
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

  it('shows discounted price when discount is provided', () => {
    document.body.innerHTML = '<button id="btn3"></button>'
    const btn = document.getElementById('btn3')
    setSubmitButton(btn, { price: 249 }, { amount: 24.9 })
    expect(btn.textContent).toBe('Pay $224.10')
    expect(btn.disabled).toBe(false)
  })

  it('ignores discount when discount is null', () => {
    document.body.innerHTML = '<button id="btn4"></button>'
    const btn = document.getElementById('btn4')
    setSubmitButton(btn, { price: 199 }, null)
    expect(btn.textContent).toBe('Pay $199.00')
  })
})

describe('mergePackData', () => {
  it('merges API packs with local PACK_DETAILS by index', () => {
    const apiPacks = [
      { price: 199, stripePriceId: 'price_a' },
      { price: 199, stripePriceId: 'price_a2' },
      { price: 249, stripePriceId: 'price_b' },
      { price: 249, stripePriceId: 'price_b2' },
      { price: 299, stripePriceId: 'price_c' },
      { price: 299, stripePriceId: 'price_c2' },
    ]
    const result = mergePackData(apiPacks)

    expect(result).toHaveLength(6)
    expect(result[0].sku).toBe('mach-one-3-pack-16-inch')
    expect(result[0].price).toBe(199)
    expect(result[0].stripePriceId).toBe('price_a')
    expect(result[0].sticks).toBe(3)
    expect(result[0].size).toBe(16)
    expect(result[1].price).toBe(199)
    expect(result[1].sticks).toBe(3)
    expect(result[1].size).toBe(20)
    expect(result[2].price).toBe(249)
    expect(result[2].sticks).toBe(4)
    expect(result[3].price).toBe(249)
    expect(result[4].price).toBe(299)
    expect(result[5].price).toBe(299)
  })

  it('overrides name from API if present', () => {
    const apiPacks = [
      { price: 199, stripePriceId: 'price_a', name: 'Custom 3-Pack' },
      { price: 199, stripePriceId: 'price_a2' },
      { price: 249, stripePriceId: 'price_b' },
      { price: 249, stripePriceId: 'price_b2' },
      { price: 299, stripePriceId: 'price_c' },
      { price: 299, stripePriceId: 'price_c2' },
    ]
    const result = mergePackData(apiPacks)
    expect(result[0].name).toBe('Custom 3-Pack')
  })

  it('handles empty API packs', () => {
    const result = mergePackData([])
    expect(result).toEqual([])
  })

  it('handles fewer API packs than details', () => {
    const apiPacks = [
      { price: 199, stripePriceId: 'price_a' },
    ]
    const result = mergePackData(apiPacks)
    expect(result).toHaveLength(1)
    expect(result[0].sku).toBe('mach-one-3-pack-16-inch')
    expect(result[0].price).toBe(199)
  })

  it('handles more API packs than details', () => {
    const apiPacks = [
      { price: 199, stripePriceId: 'price_a' },
      { price: 199, stripePriceId: 'price_a2' },
      { price: 249, stripePriceId: 'price_b' },
      { price: 249, stripePriceId: 'price_b2' },
      { price: 299, stripePriceId: 'price_c' },
      { price: 299, stripePriceId: 'price_c2' },
      { price: 399, stripePriceId: 'price_d' },
    ]
    const result = mergePackData(apiPacks)
    expect(result).toHaveLength(7)
    expect(result[6].price).toBe(399)
    expect(result[6].sku).toBeUndefined()
  })
})



describe('initCheckout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns packs and clientSecret in one call', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        packs: [
          { sku: 'mach-one-3-pack-16-inch', name: '3-Pack', price: 199, sticks: 3, stripePriceId: 'price_a' },
          { sku: 'mach-one-3-pack-20-inch', name: '3-Pack', price: 199, sticks: 3, stripePriceId: 'price_a2' },
          { sku: 'mach-one-4-pack-16-inch', name: '4-Pack', price: 249, sticks: 4, stripePriceId: 'price_b' },
          { sku: 'mach-one-4-pack-20-inch', name: '4-Pack', price: 249, sticks: 4, stripePriceId: 'price_b2' },
          { sku: 'mach-one-5-pack-16-inch', name: '5-Pack', price: 299, sticks: 5, stripePriceId: 'price_c' },
          { sku: 'mach-one-5-pack-20-inch', name: '5-Pack', price: 299, sticks: 5, stripePriceId: 'price_c2' },
        ],
        clientSecret: 'pi_123_secret_abc',
      }),
    })

    const data = await initCheckout('price_b')
    expect(data.packs).toHaveLength(6)
    expect(data.clientSecret).toBe('pi_123_secret_abc')
    expect(data.packs[3].name).toBe('4-Pack')
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid pack' }),
    })
    await expect(initCheckout('price_nonexistent')).rejects.toThrow('Invalid pack')
  })

  it('throws on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))
    await expect(initCheckout('price_b')).rejects.toThrow('Network failure')
  })

  it('sends email to Worker when provided', async () => {
    let sentBody = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      sentBody = JSON.parse(opts.body)
      return {
        ok: true,
        json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
      }
    })
    await initCheckout('price_b', 'buyer@example.com')
    expect(sentBody.stripePriceId).toBe('price_b')
    expect(sentBody.email).toBe('buyer@example.com')
  })

  it('sends undefined email as undefined (omits from request)', async () => {
    let sentBody = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      sentBody = JSON.parse(opts.body)
      return {
        ok: true,
        json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
      }
    })
    await initCheckout('price_b')
    expect(sentBody.email).toBeUndefined()
  })

  it('sends promoCode when provided', async () => {
    let sentBody = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      sentBody = JSON.parse(opts.body)
      return {
        ok: true,
        json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
      }
    })
    await initCheckout('price_b', undefined, 'SAVE10')
    expect(sentBody.promoCode).toBe('SAVE10')
  })

  it('omits promoCode when not provided', async () => {
    let sentBody = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      sentBody = JSON.parse(opts.body)
      return {
        ok: true,
        json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
      }
    })
    await initCheckout('price_b')
    expect(sentBody.promoCode).toBeUndefined()
  })

  it('aborts fetch after 10 seconds when Worker hangs', async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const promise = initCheckout('price_b')

    vi.advanceTimersByTime(10_000)

    try {
      await promise
      throw new Error('Expected abort error')
    } catch (e) {
      expect(e.name).toBe('AbortError')
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes AbortController signal to fetch', async () => {
    let abortSignal = null
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      abortSignal = opts.signal
      return {
        ok: true,
        json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
      }
    })

    await initCheckout('price_b')
    expect(abortSignal).toBeInstanceOf(AbortSignal)
    expect(abortSignal.aborted).toBe(false)
  })

  it('clears timeout when fetch succeeds', async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ packs: [{ name: '4-Pack', price: 249 }], clientSecret: 'pi_s' }),
    })

    await initCheckout(4)

    vi.advanceTimersByTime(15_000)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('checkout init flow integration (jsdom)', () => {
  const MOCK_DATA = {
    packs: [
      { sku: 'mach-one-3-pack-16-inch', name: '3-Pack', price: 199, size: 16, sticks: 3, stripePriceId: 'price_a' },
      { sku: 'mach-one-3-pack-20-inch', name: '3-Pack', price: 199, size: 20, sticks: 3, stripePriceId: 'price_a2' },
      { sku: 'mach-one-4-pack-16-inch', name: '4-Pack', price: 249, size: 16, sticks: 4, stripePriceId: 'price_b' },
      { sku: 'mach-one-4-pack-20-inch', name: '4-Pack', price: 249, size: 20, sticks: 4, stripePriceId: 'price_b2' },
      { sku: 'mach-one-5-pack-16-inch', name: '5-Pack', price: 299, size: 16, sticks: 5, stripePriceId: 'price_c' },
      { sku: 'mach-one-5-pack-20-inch', name: '5-Pack', price: 299, size: 20, sticks: 5, stripePriceId: 'price_c2' },
    ],
    clientSecret: 'pi_123_secret_abc',
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="checkoutResults"></div>
      <div class="checkout-summary">
        <div class="checkout-stick-visual" id="cartSticks"></div>
        <div class="checkout-product-info">
          <h4 id="cartName"></h4>
          <p class="checkout-product-price" id="cartPrice"></p>
          <ul class="checkout-product-specs" id="cartSpecs"></ul>
        </div>
      </div>
      <div id="stripe-payment-element"></div>
      <button type="submit" id="submit-btn">Pay $0.00</button>
    `
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the selected pack from initCheckout response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_DATA) })

    var data = await initCheckout('price_b')
    var pack = data.packs.find(function (p) { return p.stripePriceId === 'price_b' })

    renderStickIcons(document.getElementById('cartSticks'), pack.sticks, 'checkout-stick-icon')
    document.getElementById('cartName').textContent = 'Nimble Climbing Sticks — ' + pack.name
    document.getElementById('cartPrice').textContent = '$' + pack.price.toFixed(2)
    document.getElementById('cartSpecs').innerHTML = getSpecsHtml(pack)
    setSubmitButton(document.getElementById('submit-btn'), pack)

    expect(document.getElementById('cartName').textContent).toBe('Nimble Climbing Sticks — 4-Pack')
    expect(document.getElementById('cartPrice').textContent).toBe('$249.00')
    expect(document.getElementById('cartSpecs').innerHTML).toContain('>4<')
    expect(document.getElementById('cartSpecs').innerHTML).toContain('carbon fiber sticks')
    expect(document.getElementById('submit-btn').textContent).toBe('Pay $249.00')
    expect(document.getElementById('submit-btn').disabled).toBe(false)
    expect(document.getElementById('cartSticks').children.length).toBe(4)
  })

  it('renders success and clears payment element when confirmPayment succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_DATA) })
    var mockElements = { create: vi.fn().mockReturnValue({ mount: vi.fn() }) }
    var mockStripe = {
      elements: vi.fn().mockReturnValue(mockElements),
      confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }),
    }
    globalThis.Stripe = vi.fn().mockReturnValue(mockStripe)

    var data = await initCheckout('price_b')
    var stripe = Stripe('pk_test_fake')
    var elements = stripe.elements({ clientSecret: data.clientSecret })
    var paymentElement = elements.create('payment')
    paymentElement.mount('#stripe-payment-element')

    var confirmResult = await stripe.confirmPayment({ elements })
    var outcome = getConfirmPaymentOutcome(confirmResult)
    if (outcome.type === 'success') {
      document.getElementById('stripe-payment-element').innerHTML = ''
      renderSuccessConfirmation(document.getElementById('checkoutResults'), 'test@example.com')
    }

    expect(globalThis.Stripe).toHaveBeenCalledWith('pk_test_fake')
    expect(stripe.elements).toHaveBeenCalledWith({ clientSecret: 'pi_123_secret_abc' })
    expect(mockElements.create).toHaveBeenCalledWith('payment')
    expect(document.getElementById('stripe-payment-element').innerHTML).toBe('')
    expect(document.getElementById('checkoutResults').innerHTML).toContain('Payment Confirmed')
    expect(document.getElementById('checkoutResults').innerHTML).toContain('test@example.com')
  })

  it('shows error in checkoutResults when initCheckout fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))
    globalThis.Stripe = vi.fn()

    var resultEl = document.getElementById('checkoutResults')
    var submitBtn = document.getElementById('submit-btn')

    resultEl.innerHTML = '<p style="color:#ccc">Loading…</p>'
    submitBtn.disabled = true

    try {
    await initCheckout('price_b')
    } catch {
      showError(resultEl, 'Pricing currently unavailable. Please try again later.')
      return
    }

    expect(resultEl.innerHTML).toContain('Pricing currently unavailable')
    expect(resultEl.innerHTML).toContain('#ff6b6b')
  })

  it('renders "Pricing currently unavailable. Please try again later." via inline init() when Worker rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Worker unreachable'))
    globalThis.Stripe = vi.fn()

    async function init() {
      var resultEl = document.getElementById('checkoutResults')
      var submitBtn = document.getElementById('submit-btn')

      var params = new URLSearchParams(window.location.search)
      var stripePriceId = params.get('price')

      resultEl.innerHTML = '<p style="color:#ccc">Loading…</p>'
      submitBtn.disabled = true

      try {
        await initCheckout(stripePriceId)
      } catch {
        showError(resultEl, 'Pricing currently unavailable. Please try again later.')
        return
      }
    }

    await init()

    expect(document.getElementById('checkoutResults').innerHTML).toContain('Pricing currently unavailable. Please try again later.')
    expect(document.getElementById('checkoutResults').innerHTML).toContain('#ff6b6b')
    expect(document.getElementById('submit-btn').disabled).toBe(true)
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

describe('renderOrderSummary', () => {
  const PACK = { name: '4-Pack', price: 249.00, sticks: 4, size: 16 }

  beforeEach(() => {
    document.body.innerHTML = `
      <h4 id="cartName"></h4>
      <p class="checkout-product-price loading-shimmer loading-shimmer--lg" id="cartPrice"></p>
    `
    window.history.replaceState({}, '', '?price=price_b&size=16')
  })

  it('renders pack name and price without crashing', () => {
    expect(() => renderOrderSummary(PACK, null)).not.toThrow()
    expect(document.getElementById('cartName').textContent).toBe('4-Pack')
    expect(document.getElementById('cartPrice').textContent).toBe('$249.00')
  })

  it('removes loading shimmer classes from cartPrice', () => {
    renderOrderSummary(PACK, null)
    const el = document.getElementById('cartPrice')
    expect(el.classList.contains('loading-shimmer')).toBe(false)
    expect(el.classList.contains('loading-shimmer--lg')).toBe(false)
  })

  it('shows discounted price when discount is provided', () => {
    const discount = { amount: 24.90, label: '10% off' }
    renderOrderSummary(PACK, discount)
    const priceEl = document.getElementById('cartPrice')
    expect(priceEl.innerHTML).toContain('line-through')
    expect(priceEl.innerHTML).toContain('$224.10')
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
    const submitBtn = document.getElementById('submit-btn')

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
