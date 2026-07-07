export function getFormspreeStatus(response, data) {
  if (response.ok) return null
  if (Object.hasOwn(data, 'errors')) {
    return data.errors.map(error => error["message"]).join(", ")
  }
  return "Oops! Something went wrong. Try just emailing joey@nimblehunting.com"
}

export function initSignupForm() {
  const form = document.getElementById("waitingListForm")
  const status = document.getElementById("waitingListFormStatus")

  async function handleSubmit(event) {
    event.preventDefault()

    const token = await grecaptcha.execute('6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C', {action: 'submit'})
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
