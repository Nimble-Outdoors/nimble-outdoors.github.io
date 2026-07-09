export function getFormspreeStatus(response, data) {
  if (response.ok) return null
  if (Object.hasOwn(data, 'errors')) {
    return data.errors.map(error => error["message"]).join(", ")
  }
  return "Oops! Something went wrong. Try just emailing joey@nimblehunting.com"
}

const WORKER_URL = 'https://turnstile-siteverify-nimble.joey-956.workers.dev'

export function initSignupForm() {
  const form = document.getElementById("waitingListForm")
  const status = document.getElementById("waitingListFormStatus")

  async function handleSubmit(event) {
    event.preventDefault()

    const token = form.querySelector('[name="cf-turnstile-response"]')?.value
    if (!token) {
      status.innerHTML = "Verification failed. Please try again."
      return
    }

    const verifyRes = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyData.success) {
      status.innerHTML = "Verification failed. Please try again."
      return
    }

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
          const msg = getFormspreeStatus(response, data)
          status.innerHTML = msg || "You're all signed up!"
        })
      }
    }).catch(() => {
      status.innerHTML = "Oops! Something went wrong. Try just emailing joey@nimblehunting.com"
    })
  }

  form.addEventListener("submit", handleSubmit)
}
