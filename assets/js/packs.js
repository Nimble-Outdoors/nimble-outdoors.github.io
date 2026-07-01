const PRICES_URL = 'https://nimble-stripe.joey-956.workers.dev/api/prices'

export const PACK_DETAILS = [
  { sku: "pack-3", name: "3-Pack", weight: "2 lb 7 oz", sticks: 3, climb: "~12 ft", desc: "Lightest setup. Perfect for run-and-gun hunts." },
  { sku: "pack-4", name: "4-Pack", weight: "3 lb 4 oz", sticks: 4, climb: "~16 ft", desc: "The sweet spot. Enough height for most setups." },
  { sku: "pack-5", name: "5-Pack", weight: "4 lb 1 oz", sticks: 5, climb: "~20 ft", desc: "Maximum reach. For hunters who want every option." },
]

let cachedPacks = null

export function resetPacksCache() {
  cachedPacks = null
}

export async function fetchPacks() {
  if (cachedPacks) return cachedPacks
  const response = await fetch(PRICES_URL)
  if (!response.ok) throw new Error('Failed to load pricing')
  const prices = await response.json()
  cachedPacks = PACK_DETAILS.map(detail => {
    const match = prices.find(p => p.sku === detail.sku)
    if (!match) throw new Error('Pricing unavailable for ' + detail.name)
    return { ...detail, price: match.price, stripePriceId: match.stripePriceId }
  })
  return cachedPacks
}

export function getSpecsHtml(pack) {
  return [
    `<li><strong>${pack.sticks}</strong> carbon fiber sticks</li>`,
    `<li><strong>${pack.weight}</strong> total weight</li>`,
    `<li><strong>${pack.climb}</strong> climb height</li>`,
    `<li>Daisy chain rope attachment</li>`,
    `<li>Made in Osseo, Wisconsin</li>`,
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
