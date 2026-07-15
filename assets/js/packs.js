import { getPackDetails } from './pack-details.js'

const PRICES_URL = 'https://nimble-stripe.joey-956.workers.dev/api/prices'

let cachedPacks = null

export function resetPacksCache() {
  cachedPacks = null
}

export async function fetchPacks() {
  if (cachedPacks) return cachedPacks
  const response = await fetch(PRICES_URL)
  if (!response.ok) throw new Error('Failed to load pricing')
  const prices = await response.json()
  cachedPacks = getPackDetails().map(detail => {
    const match = prices.find(p => p.sku === detail.sku)
    if (!match) throw new Error('Pricing unavailable for ' + detail.name)
    return { ...detail, price: match.price, stripePriceId: match.stripePriceId }
  })
  return cachedPacks
}

export function getSpecsHtml(pack) {
  return [
    `<li><strong>${pack.sticks}</strong> carbon fiber sticks</li>`,
  ].join('')
}

export function renderStickIcons(container, count, className) {
  container.innerHTML = ''
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    s.className = className
    container.appendChild(s)
  }
}
