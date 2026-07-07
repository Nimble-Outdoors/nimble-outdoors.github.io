/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getFormspreeStatus, initSignupForm } from '../assets/js/signup.js'

describe('getFormspreeStatus', () => {
  it('returns null for successful response', () => {
    const res = { ok: true }
    expect(getFormspreeStatus(res, {})).toBeNull()
  })

  it('returns joined error messages when errors array present', () => {
    const res = { ok: false }
    const data = {
      errors: [
        { message: 'Email is invalid' },
        { message: 'Already subscribed' },
      ],
    }
    expect(getFormspreeStatus(res, data)).toBe('Email is invalid, Already subscribed')
  })

  it('returns fallback message when no errors key', () => {
    const res = { ok: false }
    const data = { error: 'Something broke' }
    expect(getFormspreeStatus(res, data)).toBe(
      'Oops! Something went wrong. Try just emailing joey@nimblehunting.com'
    )
  })

  it('returns empty string for empty errors array', () => {
    const res = { ok: false }
    const data = { errors: [] }
    expect(getFormspreeStatus(res, data)).toBe('')
  })
})

describe('initSignupForm', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="waitingListForm" action="https://formspree.io/f/mykdrwlr" method="POST">
        <input type="email" name="email" value="test@example.com" required />
        <input type="hidden" id="g-recaptcha-response" name="g-recaptcha-response" />
        <button type="submit">Sign Up</button>
      </form>
      <p id="waitingListFormStatus"></p>
    `
    globalThis.grecaptcha = {
      execute: vi.fn().mockResolvedValue('recaptcha_token_abc'),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows success message and resets form on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe("You're all signed up!")
    })
    expect(document.getElementById('g-recaptcha-response').value).toBe('recaptcha_token_abc')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://formspree.io/f/mykdrwlr',
      expect.objectContaining({ method: 'post' })
    )
  })

  it('shows error messages from Formspree errors array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ errors: [{ message: 'Email is invalid' }] }),
    })

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe('Email is invalid')
    })
  })

  it('shows fallback message when errors key is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    })

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Oops! Something went wrong. Try just emailing joey@nimblehunting.com'
      )
    })
  })

  it('shows fallback message on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Oops! Something went wrong. Try just emailing joey@nimblehunting.com'
      )
    })
  })

  it('injects reCAPTCHA token into hidden field', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('g-recaptcha-response').value).toBe('recaptcha_token_abc')
    })
  })
})
