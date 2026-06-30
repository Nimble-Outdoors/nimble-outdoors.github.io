import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

// Set env var before importing the worker module
globalThis.STRIPE_SECRET_KEY = 'sk_test_mock'

const worker = (await import('../worker/src/index.js')).default

beforeEach(() => {
  vi.restoreAllMocks()
})

function mockStripe(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  })
}

describe('POST /api/create-payment-intent', () => {
  it('returns clientSecret on success', async () => {
    mockStripe(200, { client_secret: 'pi_123_secret_abc' })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 299.99, packName: '4-Pack' }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ clientSecret: 'pi_123_secret_abc' })
  })

  it('converts dollars to cents and sends correct Stripe body', async () => {
    let stripeBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      stripeBody = opts.body
      return {
        ok: true,
        json: () => Promise.resolve({ client_secret: 'pi_123_secret_abc' }),
      }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 100.00, packName: '4-Pack', email: 'test@example.com' }),
    })
    await worker.fetch(req)

    expect(stripeBody).toContain('amount=10000')
    expect(stripeBody).toContain('currency=usd')
    expect(stripeBody).toContain('description=Nimble+Climbing+Sticks+%E2%80%94+4-Pack')
    expect(stripeBody).toContain('receipt_email=test%40example.com')
    expect(stripeBody).toContain('automatic_payment_methods%5Benabled%5D=true')
  })

  it('rounds fractional amounts', async () => {
    let stripeBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      stripeBody = opts.body
      return { ok: true, json: () => Promise.resolve({ client_secret: 'pi_s' }) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 49.999 }),
    })
    await worker.fetch(req)

    expect(stripeBody).toContain('amount=5000')
  })

  it('uses default description when packName is omitted', async () => {
    let stripeBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      stripeBody = opts.body
      return { ok: true, json: () => Promise.resolve({ client_secret: 'pi_s' }) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    })
    await worker.fetch(req)

    expect(stripeBody).toContain('description=Nimble+Climbing+Sticks')
  })

  it('omits receipt_email when email is not provided', async () => {
    let stripeBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      stripeBody = opts.body
      return { ok: true, json: () => Promise.resolve({ client_secret: 'pi_s' }) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    })
    await worker.fetch(req)

    expect(stripeBody).not.toContain('receipt_email')
  })

  it('returns 400 for invalid amount (zero)', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 0 }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid amount')
  })

  it('returns 400 for invalid amount (negative)', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: -10 }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid amount')
  })

  it('returns 400 for missing amount', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid amount')
  })

  it('returns 500 when Stripe API call fails', async () => {
    mockStripe(402, { error: { message: 'Your card was declined.' } })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Your card was declined.')
  })

  it('returns 500 on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Network failure')
  })

  it('includes CORS headers on success', async () => {
    mockStripe(200, { client_secret: 'pi_123_secret_abc' })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 50 }),
    })
    const res = await worker.fetch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('includes CORS headers on error', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 0 }),
    })
    const res = await worker.fetch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('OPTIONS (CORS preflight)', () => {
  it('returns 200 with CORS headers', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'OPTIONS',
    })
    const res = await worker.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })
})

describe('GET /confirm', () => {
  it('renders success page when PaymentIntent status is succeeded', async () => {
    mockStripe(200, { id: 'pi_123', status: 'succeeded', amount: 29999 })

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=succeeded')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(html).toContain('Payment Confirmed')
    expect(html).toContain('pi_123')
    expect(html).toContain('$299.99')
    expect(html).toContain('#1F3D1B') // green border for success
    expect(html).not.toContain('Payment Failed')
  })

  it('renders failure page when PaymentIntent fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Stripe unreachable'))

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=failed')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('Your payment could not be processed.')
    expect(html).toContain('#8B0000') // red border for failure
  })

  it('renders failure page when redirect_status is not succeeded', async () => {
    mockStripe(200, { id: 'pi_123', status: 'canceled', amount: 29999 })

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=failed')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('#8B0000')
  })

  it('renders failure page with last_payment_error message', async () => {
    mockStripe(200, {
      id: 'pi_123',
      status: 'requires_payment_method',
      amount: 29999,
      last_payment_error: { message: 'insufficient funds' },
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=requires_payment_method')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('insufficient funds')
  })

  it('handles missing payment_intent param gracefully', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/confirm')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('Your payment could not be processed.')
    expect(html).not.toContain('Transaction:')
  })
})

describe('confirmationPage helper', () => {
  it('success page includes return link', async () => {
    // Re-import to access exported helper; for now test via /confirm
    mockStripe(200, { id: 'pi_x', status: 'succeeded', amount: 10000 })

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_x&redirect_status=succeeded')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('href="/"')
    expect(html).toContain('Return to Nimble Outdoors')
  })

  it('failure page includes return link and contact email', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?redirect_status=failed')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('href="/"')
    expect(html).toContain('joey@nimbleoutdoorsllc.com')
  })
})

describe('unknown routes', () => {
  it('returns 404 for unmatched paths', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/anything')
    const res = await worker.fetch(req)

    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Not found')
  })
})
