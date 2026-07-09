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
        <input type="hidden" name="cf-turnstile-response" value="turnstile_token_abc" />
        <button type="submit">Sign Up</button>
      </form>
      <p id="waitingListFormStatus"></p>
    `
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockSiteverify(success) {
    return { ok: true, json: () => Promise.resolve({ success }) }
  }

  it('shows success message and resets form on 200', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockSiteverify(true))
      .mockResolvedValueOnce({ ok: true })

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe("You're all signed up!")
    })
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://turnstile-siteverify-nimble.joey-956.workers.dev',
      expect.objectContaining({ method: 'POST' })
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://formspree.io/f/mykdrwlr',
      expect.objectContaining({ method: 'post' })
    )
  })

  it('shows error messages from Formspree errors array', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockSiteverify(true))
      .mockResolvedValueOnce({
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
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockSiteverify(true))
      .mockResolvedValueOnce({
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
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockSiteverify(true))
      .mockRejectedValueOnce(new Error('Network failure'))

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Oops! Something went wrong. Try just emailing joey@nimblehunting.com'
      )
    })
  })

  it('shows verification failed when siteverify returns false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(mockSiteverify(false))

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Verification failed. Please try again.'
      )
    })
  })

  it('shows verification failed when no turnstile token', async () => {
    document.body.innerHTML = `
      <form id="waitingListForm" action="https://formspree.io/f/mykdrwlr" method="POST">
        <input type="email" name="email" value="test@example.com" required />
        <button type="submit">Sign Up</button>
      </form>
      <p id="waitingListFormStatus"></p>
    `
    globalThis.fetch = vi.fn()

    initSignupForm()
    const form = document.getElementById('waitingListForm')
    form.dispatchEvent(new Event('submit', { cancelable: true }))

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Verification failed. Please try again.'
      )
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
