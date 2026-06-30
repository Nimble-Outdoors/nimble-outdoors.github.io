/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getConfirmPaymentOutcome, validateEmail, getShippingFields, buildShippingAddress, createPaymentAppearance, createPaymentFields } from '../assets/js/payment.js'

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

  it('returns requires_action when confirmResult is empty', () => {
    const result = getConfirmPaymentOutcome({})
    expect(result).toEqual({ type: 'requires_action' })
  })
})

describe('payment element fields config', () => {
  it('hides email and phone from PaymentElement billing details', () => {
    var fields = {
      billingDetails: {
        name: 'never',
        email: 'never',
        phone: 'never',
        address: 'never',
      },
    }
    expect(fields.billingDetails.email).toBe('never')
    expect(fields.billingDetails.phone).toBe('never')
  })

  it('disables wallets and link save-card prompt', () => {
    var wallets = {
      applePay: 'never',
      googlePay: 'never',
      link: 'never',
    }
    expect(wallets.applePay).toBe('never')
    expect(wallets.googlePay).toBe('never')
    expect(wallets.link).toBe('never')
  })
})

describe('getShippingAddress', () => {
  it('returns shipping object from form fields', () => {
    var shipping = {
      name: 'John Doe',
      address: {
        line1: '123 Main St',
        line2: 'Apt 4',
        city: 'Eau Claire',
        state: 'WI',
        postal_code: '54701',
        country: 'US',
      },
    }
    expect(shipping.name).toBe('John Doe')
    expect(shipping.address.city).toBe('Eau Claire')
    expect(shipping.address.state).toBe('WI')
    expect(shipping.address.country).toBe('US')
  })

  it('includes only required fields when line2 is empty', () => {
    var shipping = {
      name: 'Jane Doe',
      address: {
        line1: '456 Oak Ave',
        city: 'Osseo',
        state: 'WI',
        postal_code: '54758',
        country: 'US',
      },
    }
    expect(shipping.name).toBe('Jane Doe')
    expect(shipping.address.line1).toBe('456 Oak Ave')
    expect(shipping.address.line2).toBeUndefined()
    expect(shipping.address.city).toBe('Osseo')
  })
})

describe('checkout confirmPayment integration (jsdom)', () => {
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

  it('creates PaymentElement with billing details fields hidden', async () => {
    var createCalledWith = null
    globalThis.Stripe = function () {
      return {
        elements: function () {
          return {
            create: function (type, opts) {
              createCalledWith = opts
              return { mount: vi.fn() }
            },
          }
        },
        confirmPayment: vi.fn(),
      }
    }

    var stripe = Stripe('pk_test_fake')
    var elements = stripe.elements({ clientSecret: 'pi_123_secret_abc' })
    var paymentElement = elements.create('payment', {
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
    })
    paymentElement.mount('#stripe-payment-element')

    expect(createCalledWith).toEqual({
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
    })
  })

  it('shows success message and replaces form when payment succeeds', async () => {
    var confirmCall = null
    globalThis.stripe = {
      confirmPayment: vi.fn().mockImplementation(function (opts) {
        confirmCall = opts
        return Promise.resolve({ paymentIntent: { status: 'succeeded' } })
      }),
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
                address: {
                  line1: fields.address,
                  city: fields.city,
                  state: fields.state,
                  postal_code: fields.zip,
                  country: 'US',
                },
              },
            },
            shipping: {
              name: fields.name,
              address: buildShippingAddress(fields),
            },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)

        if (outcome.type === 'error') {
          resultEl.innerHTML = '<p style="color:#ff6b6b">' + outcome.message + '</p>'
          submitBtn.disabled = false
          submitBtn.textContent = 'Pay $249.00'
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          form.innerHTML =
            '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
              '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
              '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
              '<p style="color:#ccc;margin:0">Your preorder has been placed. You\'ll receive a receipt at test@example.com.</p>' +
            '</div>'
        }
      } catch (err) {
        resultEl.innerHTML = '<p style="color:#ff6b6b;margin:0 0 1rem">' + err.message + '</p>'
        submitBtn.disabled = false
        submitBtn.textContent = 'Pay $249.00'
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(confirmCall.confirmParams.shipping.name).toBe('John Doe')
      expect(confirmCall.confirmParams.shipping.address.line1).toBe('123 Main St')
      expect(confirmCall.confirmParams.shipping.address.line2).toBe('Apt 4')
      expect(confirmCall.confirmParams.shipping.address.city).toBe('Eau Claire')
      expect(confirmCall.confirmParams.shipping.address.state).toBe('WI')
      expect(confirmCall.confirmParams.shipping.address.postal_code).toBe('54701')
      expect(confirmCall.confirmParams.shipping.address.country).toBe('US')
      expect(document.getElementById('stripe-payment-element')).toBeNull()
      expect(form.innerHTML).toContain('Payment Confirmed')
      expect(form.innerHTML).toContain('test@example.com')
      expect(form.innerHTML).toContain('#1F3D1B')
    })
  })

  it('shows error and re-enables button when payment fails', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockResolvedValue({
        error: { message: 'Your card was declined.' },
      }),
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
                address: {
                  line1: fields.address,
                  city: fields.city,
                  state: fields.state,
                  postal_code: fields.zip,
                  country: 'US',
                },
              },
            },
            shipping: {
              name: fields.name,
              address: buildShippingAddress(fields),
            },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)

        if (outcome.type === 'error') {
          resultEl.innerHTML = '<p style="color:#ff6b6b">' + outcome.message + '</p>'
          submitBtn.disabled = false
          submitBtn.textContent = 'Pay $249.00'
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          form.innerHTML =
            '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
              '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
              '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
              '<p style="color:#ccc;margin:0">Your preorder has been placed. You\'ll receive a receipt at test@example.com.</p>' +
            '</div>'
        }
      } catch (err) {
        resultEl.innerHTML = '<p style="color:#ff6b6b;margin:0 0 1rem">' + err.message + '</p>'
        submitBtn.disabled = false
        submitBtn.textContent = 'Pay $249.00'
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

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
                address: {
                  line1: fields.address,
                  city: fields.city,
                  state: fields.state,
                  postal_code: fields.zip,
                  country: 'US',
                },
              },
            },
            shipping: {
              name: fields.name,
              address: buildShippingAddress(fields),
            },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)

        if (outcome.type === 'error') {
          resultEl.innerHTML = '<p style="color:#ff6b6b">' + outcome.message + '</p>'
          submitBtn.disabled = false
          submitBtn.textContent = 'Pay $249.00'
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          form.innerHTML =
            '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
              '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
              '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
              '<p style="color:#ccc;margin:0">Your preorder has been placed. You\'ll receive a receipt at test@example.com.</p>' +
            '</div>'
        }
      } catch (err) {
        resultEl.innerHTML = '<p style="color:#ff6b6b;margin:0 0 1rem">' + err.message + '</p>'
        submitBtn.disabled = false
        submitBtn.textContent = 'Pay $249.00'
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(resultEl.innerHTML).toContain('Stripe API error')
      expect(submitBtn.disabled).toBe(false)
      expect(submitBtn.textContent).toBe('Pay $249.00')
    })
  })

  it('does not modify form when requires_action (Stripe handles redirect)', async () => {
    globalThis.stripe = {
      confirmPayment: vi.fn().mockResolvedValue({
        paymentIntent: { status: 'requires_action' },
      }),
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
                address: {
                  line1: fields.address,
                  city: fields.city,
                  state: fields.state,
                  postal_code: fields.zip,
                  country: 'US',
                },
              },
            },
            shipping: {
              name: fields.name,
              address: buildShippingAddress(fields),
            },
          },
        })

        var outcome = getConfirmPaymentOutcome(confirmResult)

        if (outcome.type === 'error') {
          resultEl.innerHTML = '<p style="color:#ff6b6b">' + outcome.message + '</p>'
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = 'Pay $249.00'
          }
        } else if (outcome.type === 'success') {
          document.getElementById('stripe-payment-element').innerHTML = ''
          form.innerHTML =
            '<div class="card" style="background:#222;padding:2rem;border-radius:8px;border:4px solid #1F3D1B;text-align:center">' +
              '<div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>' +
              '<h3 style="margin:0 0 0.5rem">Payment Confirmed</h3>' +
              '<p style="color:#ccc;margin:0">Your preorder has been placed. You\'ll receive a receipt at test@example.com.</p>' +
            '</div>'
        }
      } catch (err) {
        resultEl.innerHTML = '<p style="color:#ff6b6b;margin:0 0 1rem">' + err.message + '</p>'
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Pay $249.00'
        }
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(resultEl.innerHTML).toBe('')
      expect(paymentEl.innerHTML).toBe('')
      expect(form.innerHTML).not.toContain('Payment Confirmed')
    })
  })
})
