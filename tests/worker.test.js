import { describe, it, expect, beforeEach, vi } from 'vitest'

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
      { id: 'price_a', type: 'one_time', active: true, unit_amount: 19900, currency: 'usd', product: { id: 'prod_3', active: true, name: 'Mach One 3 Pack', metadata: { sku: 'mach-one-3-pack' } } },
      { id: 'price_b', type: 'one_time', active: true, unit_amount: 24900, currency: 'usd', product: { id: 'prod_4', active: true, name: 'Mach One 4 Pack', metadata: { sku: 'mach-one-4-pack' } } },
      { id: 'price_c', type: 'one_time', active: true, unit_amount: 29900, currency: 'usd', product: { id: 'prod_5', active: true, name: 'Mack One 5 Pack', metadata: { sku: 'mach-one-5-pack' } } },
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
    expect(data[0]).toEqual({ name: 'Mach One 3 Pack', sku: 'mach-one-3-pack', price: 199, stripePriceId: 'price_a' })
    expect(data[1]).toEqual({ name: 'Mach One 4 Pack', sku: 'mach-one-4-pack', price: 249, stripePriceId: 'price_b' })
    expect(data[2]).toEqual({ name: 'Mack One 5 Pack', sku: 'mach-one-5-pack', price: 299, stripePriceId: 'price_c' })
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

describe('POST /api/init-checkout', () => {
  it('returns packs and clientSecret in one call', async () => {
    mockStripeStream([
      mockStripeOnce(pricesListResponse()),
      mockStripeOnce(priceResponse(24900)),
      mockStripeOnce(piResponse('pi_123_secret_abc')),
    ])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4 }),
    })
    const res = await worker.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.packs).toHaveLength(3)
    expect(data.clientSecret).toBe('pi_123_secret_abc')
    expect(data.packs[1].name).toBe('Mach One 4 Pack')
  })

  it('selects the correct pack by 1-based index', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices') && !url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
      }
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(29900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 3 }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('amount=29900')
    expect(piBody).toContain('description=Nimble+Climbing+Sticks+%E2%80%94+Mack+One+5+Pack')
  })

  it('defaults to pack 2 (index 2) when packIndex is invalid', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices') && !url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
      }
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 999 }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('amount=24900')
    expect(piBody).toContain('description=Nimble+Climbing+Sticks+%E2%80%94+Mach+One+4+Pack')
  })

  it('passes receipt_email when provided', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices') && !url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
      }
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4, email: 'buyer@example.com' }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('receipt_email=buyer%40example.com')
  })

  it('passes email through to Stripe PaymentIntent', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices') && !url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
      }
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4, email: 'buyer@example.com' }),
    })
    await worker.fetch(req)

    expect(piBody).toContain('receipt_email=buyer%40example.com')
  })

  it('omits receipt_email when email is not provided', async () => {
    let piBody = ''
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes('/prices') && !url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
      }
      if (url.includes('/prices/')) {
        return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
      }
      piBody = opts.body
      return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
    })

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4 }),
    })
    await worker.fetch(req)

    expect(piBody).not.toContain('receipt_email')
  })

  it('includes CORS headers', async () => {
    mockStripeStream([
      mockStripeOnce(pricesListResponse()),
      mockStripeOnce(priceResponse(24900)),
      mockStripeOnce(piResponse('pi_s')),
    ])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4 }),
    })
    const res = await worker.fetch(req)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 500 on Stripe API error', async () => {
    mockStripeStream([mockStripeOnce({ error: { message: 'API error' } }, 500)])

    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'POST',
      body: JSON.stringify({ packIndex: 4 }),
    })
    const res = await worker.fetch(req)

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('API error')
  })

  describe('promo code', () => {
    function promoListResponse(couponId) {
      return {
        data: [{
          id: 'pc_mock',
          code: 'TESTCODE',
          active: true,
          promotion: { coupon: couponId, type: 'coupon' },
          restrictions: { first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null },
        }],
      }
    }

    function couponResponse(percentOff, amountOff) {
      return { id: 'co_mock', valid: true, percent_off: percentOff, amount_off: amountOff }
    }

    it('applies percentage discount and passes discounts param', async () => {
      let piBody = ''
      globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve(promoListResponse('co_mock')) }
        }
        if (url.includes('/coupons/')) {
          return { ok: true, json: () => Promise.resolve(couponResponse(10, null)) }
        }
        piBody = opts.body
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, promoCode: 'SAVE10' }),
      })
      const res = await worker.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(piBody).toContain('amount=22410')
      expect(data.discount).toEqual({ amount: 24.9, label: '10% off', code: 'SAVE10' })
    })

    it('applies fixed amount discount', async () => {
      let piBody = ''
      globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(29900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve(promoListResponse('co_mock')) }
        }
        if (url.includes('/coupons/')) {
          return { ok: true, json: () => Promise.resolve(couponResponse(null, 5000)) }
        }
        piBody = opts.body
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 5, promoCode: 'FLAT50' }),
      })
      const res = await worker.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(piBody).toContain('amount=24900')
      expect(data.discount).toEqual({ amount: 50, label: '$50.00 off', code: 'FLAT50' })
    })

    it('returns 400 for invalid promo code', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve({ data: [] }) }
        }
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, promoCode: 'BADCODE' }),
      })
      const res = await worker.fetch(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired promo code.')
    })

    it('returns 400 when promotion.coupon is missing', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve({
            data: [{ id: 'pc_mock', code: 'NOCOUPON', active: true, promotion: { type: 'coupon' } }],
          })}
        }
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, promoCode: 'NOCOUPON' }),
      })
      const res = await worker.fetch(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired promo code.')
    })

    it('returns 400 when coupon is invalid', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve(promoListResponse('co_mock')) }
        }
        if (url.includes('/coupons/')) {
          return { ok: true, json: () => Promise.resolve({ id: 'co_mock', valid: false }) }
        }
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, promoCode: 'INVALID' }),
      })
      const res = await worker.fetch(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired promo code.')
    })

    it('ignores empty promoCode string', async () => {
      let piBody = ''
      globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          piBody = 'should_not_be_called'
          return { ok: true, json: () => Promise.resolve({ data: [] }) }
        }
        piBody = opts.body
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, promoCode: '' }),
      })
      const res = await worker.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(piBody).toContain('amount=24900')
      expect(data.discount).toBeUndefined()
    })

    it('works alongside email', async () => {
      let piBody = ''
      globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
        if (url.includes('/prices') && !url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(pricesListResponse()) }
        }
        if (url.includes('/prices/')) {
          return { ok: true, json: () => Promise.resolve(priceResponse(24900)) }
        }
        if (url.includes('/promotion_codes')) {
          return { ok: true, json: () => Promise.resolve(promoListResponse('co_mock')) }
        }
        if (url.includes('/coupons/')) {
          return { ok: true, json: () => Promise.resolve(couponResponse(10, null)) }
        }
        piBody = opts.body
        return { ok: true, json: () => Promise.resolve(piResponse('pi_s')) }
      })

      const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
        method: 'POST',
        body: JSON.stringify({ packIndex: 4, email: 'buyer@example.com', promoCode: 'SAVE10' }),
      })
      await worker.fetch(req)

      expect(piBody).toContain('amount=22410')
      expect(piBody).toContain('receipt_email=buyer%40example.com')
    })
  })
})

describe('OPTIONS (CORS preflight)', () => {
  it('returns 200 with CORS headers for known path', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/create-payment-intent', {
      method: 'OPTIONS',
    })
    const res = await worker.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })

  it('returns CORS headers for unknown path (preflight for init-checkout before deploy)', async () => {
    const req = new Request('https://nimble-stripe.example.workers.dev/api/init-checkout', {
      method: 'OPTIONS',
    })
    const res = await worker.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
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
    expect(html).toContain('joey@nimblehunting.com')
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
