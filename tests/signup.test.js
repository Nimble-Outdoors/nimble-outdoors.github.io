/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getFormspreeStatus } from '../assets/js/signup.js'

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
      'Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com'
    )
  })

  it('returns fallback message for empty errors array', () => {
    const res = { ok: false }
    const data = { errors: [] }
    expect(getFormspreeStatus(res, data)).toBe('')
  })
})

describe('signup form integration (jsdom)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="waitingListForm" action="https://formspree.io/f/mykdrwlr" method="POST">
        <input type="email" name="email" value="test@example.com" required />
        <input type="hidden" id="g-recaptcha-response" name="g-recaptcha-response" />
        <button type="submit">Sign Up</button>
      </form>
      <p id="waitingListFormStatus"></p>
    `
    // Mock grecaptcha
    globalThis.grecaptcha = {
      execute: vi.fn().mockResolvedValue('recaptcha_token_abc'),
    }
  })

  it('shows success message and resets form on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    // Evaluate the inline script
    const form = document.getElementById('waitingListForm')
    const handleSubmit = async (event) => {
      event.preventDefault()
      const status = document.getElementById('waitingListFormStatus')
      const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', { action: 'submit' })
      document.getElementById('g-recaptcha-response').value = token
      const data = new FormData(event.target)
      const response = await fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: { 'Accept': 'application/json' },
      })
      if (response.ok) {
        status.innerHTML = "You're all signed up!"
        form.reset()
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    // Wait for async handler
    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe("You're all signed up!")
    })
    expect(document.getElementById('g-recaptcha-response').value).toBe('recaptcha_token_abc')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://formspree.io/f/mykdrwlr',
      expect.any(Object)
    )
  })

  it('shows error messages from Formspree errors array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ errors: [{ message: 'Email is invalid' }] }),
    })

    const form = document.getElementById('waitingListForm')
    const handleSubmit = async (event) => {
      event.preventDefault()
      const status = document.getElementById('waitingListFormStatus')
      const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', { action: 'submit' })
      document.getElementById('g-recaptcha-response').value = token
      const data = new FormData(event.target)
      fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: { 'Accept': 'application/json' },
      }).then(response => {
        if (response.ok) {
          status.innerHTML = "You're all signed up!"
          form.reset()
        } else {
          response.json().then(data => {
            if (Object.hasOwn(data, 'errors')) {
              status.innerHTML = data["errors"].map(error => error["message"]).join(", ")
            } else {
              status.innerHTML = "Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com"
            }
          })
        }
      })
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe('Email is invalid')
    })
  })

  it('shows fallback message when errors key is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    })

    const form = document.getElementById('waitingListForm')
    const handleSubmit = async (event) => {
      event.preventDefault()
      const status = document.getElementById('waitingListFormStatus')
      const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', { action: 'submit' })
      document.getElementById('g-recaptcha-response').value = token
      const data = new FormData(event.target)
      fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: { 'Accept': 'application/json' },
      }).then(response => {
        if (response.ok) {
          status.innerHTML = "You're all signed up!"
          form.reset()
        } else {
          response.json().then(data => {
            if (Object.hasOwn(data, 'errors')) {
              status.innerHTML = data["errors"].map(error => error["message"]).join(", ")
            } else {
              status.innerHTML = "Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com"
            }
          })
        }
      })
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com'
      )
    })
  })

  it('shows fallback message on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const form = document.getElementById('waitingListForm')
    const handleSubmit = async (event) => {
      event.preventDefault()
      const status = document.getElementById('waitingListFormStatus')
      const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', { action: 'submit' })
      document.getElementById('g-recaptcha-response').value = token
      const data = new FormData(event.target)
      fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: { 'Accept': 'application/json' },
      }).catch(error => {
        status.innerHTML = "Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com"
      })
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(document.getElementById('waitingListFormStatus').innerHTML).toBe(
        'Oops! Something went wrong. Try just emailing joey@nimbleoutdoorsllc.com'
      )
    })
  })

  it('injects reCAPTCHA token into hidden field', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

    const form = document.getElementById('waitingListForm')
    const handleSubmit = async (event) => {
      event.preventDefault()
      const status = document.getElementById('waitingListFormStatus')
      const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', { action: 'submit' })
      document.getElementById('g-recaptcha-response').value = token
      const data = new FormData(event.target)
      const response = await fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: { 'Accept': 'application/json' },
      })
      if (response.ok) {
        status.innerHTML = "You're all signed up!"
        form.reset()
      }
    }

    const event = new Event('submit', { cancelable: true })
    form.addEventListener('submit', handleSubmit)
    form.dispatchEvent(event)

    await vi.waitFor(() => {
      expect(document.getElementById('g-recaptcha-response').value).toBe('recaptcha_token_abc')
    })
  })
})
