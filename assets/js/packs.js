export const PACKS = [
  { name: "3-Pack", price: 199, weight: "2 lb 7 oz", sticks: 3, climb: "~12 ft", desc: "Lightest setup. Perfect for run-and-gun hunts." },
  { name: "4-Pack", price: 249, weight: "3 lb 4 oz", sticks: 4, climb: "~16 ft", desc: "The sweet spot. Enough height for most setups." },
  { name: "5-Pack", price: 299, weight: "4 lb 1 oz", sticks: 5, climb: "~20 ft", desc: "Maximum reach. For hunters who want every option." },
]

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

export function getPackByIndex(index) {
  return PACKS[index]
}
