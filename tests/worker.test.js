import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

globalThis.STRIPE_SECRET_KEY = 'sk_test_mock'

const worker = (await import('../worker/src/index.js')).default

beforeEach(() => {
  vi.restoreAllMocks()
})

function mockStripeStream(calls) {
  let callIndex = 0
  globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
    const handler = calls[callIndex] || calls[calls.length - 1]
    callIndex++
    const result = typeof handler === 'function' ? handler(url, opts) : handler
    return {
      ok: result.status >= 200 && result.status < 300,
      json: () => Promise.resolve(result.body),
    }
  })
}

function mockStripeOnce(body, status = 200) {
  return { status, body }
}

function priceResponse(unitAmount) {
  return { id: 'price_3pack', unit_amount: unitAmount, currency: 'usd' }
}

function piResponse(clientSecret) {
  return { client_secret: clientSecret }
}

function pricesListResponse() {
  return {
    data: [
      { id: 'price_a', type: 'one_time', active: true, unit_amount: 19900, currency: 'usd', product: { id: 'prod_3', active: true, name: 'Mach One 3 Pack', metadata: { sku: 'pack-3' } } },
      { id: 'price_b', type: 'one_time', active: true, unit_amount: 24900, currency: 'usd', product: { id: 'prod_4', active: true, name: 'Mach One 4 Pack', metadata: { sku: 'pack-4' } } },
      { id: 'price_c', type: 'one_time', active: true, unit_amount: 29900, currency: 'usd', product: { id: 'prod_5', active: true, name: 'Mack One 5 Pack', metadata: { sku: 'pack-5' } } },
    ],
  }
}

describe('GET /api/prices', () => {
  it('returns all active prices sorted ascending', async () => {
    mockStripeStream([mockStripeOnce(pricesListResponse())])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/prices')
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(3)
    expect(data[0]).toEqual({ name: 'Mach One 3 Pack', sku: 'pack-3', price: 199, stripePriceId: 'price_a' })
    expect(data[1]).toEqual({ name: 'Mach One 4 Pack', sku: 'pack-4', price: 249, stripePriceId: 'price_b' })
    expect(data[2]).toEqual({ name: 'Mack One 5 Pack', sku: 'pack-5', price: 299, stripePriceId: 'price_c' })
  })

  it('returns 500 on Stripe API error', async () => {
    mockStripeStream([mockStripeOnce({ error: { message: 'API error' } }, 500)])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/prices')
    const res = await worker.fetch(req)

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('API error')
  })

  it('includes CORS headers', async () => {
    mockStripeStream([mockStripeOnce(pricesListResponse())])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/prices')
    const res = await worker.fetch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('POST /api/create-payment-intent', () => {
  it('returns clientSecret on success', async () => {
    mockStripeStream([
      mockStripeOnce(priceResponse(29900)),
      mockStripeOnce(piResponse('pi_123_secret_abc')),
    ])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_5pack', packName: '5-Pack' }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ clientSecret: 'pi_123_secret_abc' })
  })

  it('sends correct Stripe body using price unit_amount', async () => {
    let stripeCalls = []
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      stripeCalls.push({ url, body: opts.body })
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
      }
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_4pack', packName: '4-Pack', email: 'test@example.com' }),
    })
    await worker.fetch(req)

    const piBody = stripeCalls.find(c => c.url.includes('/payment_intents')).body
    expect(piBody).toContain('amount=24900')
    expect(piBody).toContain('currency=usd')
    expect(piBody).toContain('description=Nimble+Climbing+Sticks+%E2%80%94+4-Pack')
    expect(piBody).toContain('receipt_email=test%40example.com')
    expect(piBody).toContain('payment_method_types%5B%5D=card')
  })

  it('uses only card payment method', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(19900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_3pack' }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('payment_method_types%5B%5D=card')
  })

  it('uses default description when packName is omitted', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(19900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_3pack' }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('description=Nimble+Climbing+Sticks')
  })

  it('omits receipt_email when email is not provided', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(19900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_3pack' }),
    })
    await worker.fetch(req)

    expect(piBody).not.toContain('receipt_email')
  })

  it('returns 400 for missing priceId', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid price')
  })

  it('returns 400 for empty priceId', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: '' }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid price')
  })

  it('returns 500 when Stripe price lookup fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('/prices/')) {
        return { ok: false, json: () => Promise.resolve({ error: { message: 'Price not found' } }) }
      }
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_invalid' }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Price not found')
  })

  it('returns 500 on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_3pack' }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Network failure')
  })

  it('includes CORS headers on success', async () => {
    mockStripeStream([
      mockStripeOnce(priceResponse(19900)),
      mockStripeOnce(piResponse('pi_s')),
    ])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_3pack' }),
    })
    const res = await worker.fetch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('includes CORS headers on error', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({}),
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
    mockStripeStream([mockStripeOnce({ id: 'pi_123', status: 'succeeded', amount: 29999 })])

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=succeeded')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(html).toContain('Payment Confirmed')
    expect(html).toContain('pi_123')
    expect(html).toContain('$299.99')
    expect(html).toContain('#1F3D1B')
    expect(html).not.toContain('Payment Failed')
  })

  it('renders failure page when PaymentIntent fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Stripe unreachable'))

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=failed')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('Your payment could not be processed.')
    expect(html).toContain('#8B0000')
  })

  it('renders failure page when redirect_status is not succeeded', async () => {
    mockStripeStream([mockStripeOnce({ id: 'pi_123', status: 'canceled', amount: 29999 })])

    const req = new Request('https://nimble-stripe.example.workers.dev/confirm?payment_intent=pi_123&redirect_status=failed')
    const res = await worker.fetch(req)
    const html = await res.text()

    expect(html).toContain('Payment Failed')
    expect(html).toContain('#8B0000')
  })

  it('renders failure page with last_payment_error message', async () => {
    mockStripeStream([mockStripeOnce({
      id: 'pi_123',
      status: 'requires_payment_method',
      amount: 29999,
      last_payment_error: { message: 'insufficient funds' },
    })])

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
    mockStripeStream([mockStripeOnce({ id: 'pi_x', status: 'succeeded', amount: 10000 })])

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
