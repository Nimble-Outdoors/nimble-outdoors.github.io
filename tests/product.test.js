/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function productDom() {
  document.body.innerHTML = `
    <p id="packPrice" class="loading-shimmer loading-shimmer--lg"></p>
    <p id="packDesc"></p>
    <span id="packSticks"></span>
    <span id="packWeight"></span>
    <a id="orderLink" href="/checkout.html?pack=1">Checkout</a>
  `
}

function selectPack(packs, index) {
  var pack = packs[index]
  document.getElementById("packDesc").textContent = pack.desc
  document.getElementById("packSticks").textContent = pack.sticks
  document.getElementById("packWeight").textContent = pack.weight
  document.getElementById("packPrice").textContent = "$" + pack.price
  document.getElementById("packPrice").classList.remove("loading-shimmer", "loading-shimmer--lg")
  var ctaPrice = document.getElementById("ctaPrice")
  if (ctaPrice) {
    ctaPrice.textContent = "$" + pack.price
    ctaPrice.classList.remove("loading-shimmer", "loading-shimmer--lg")
  }
  document.getElementById("orderLink").href = "/checkout.html?pack=" + (index + 1)
  var orderLink2 = document.getElementById("orderLink2")
  if (orderLink2) orderLink2.href = "/checkout.html?pack=" + (index + 1)
}

const PACKS = [
  { name: '3-Pack', desc: 'Lightest setup.', sticks: 3, weight: '2 lb 7 oz', price: 495 },
  { name: '4-Pack', desc: 'The sweet spot.', sticks: 4, weight: '3 lb 4 oz', price: 620 },
  { name: '5-Pack', desc: 'Maximum reach.', sticks: 5, weight: '4 lb 1 oz', price: 745 },
]

describe('product page selectPack', () => {
  beforeEach(() => productDom())

  it('sets the price on packPrice without ctaPrice element', () => {
    selectPack(PACKS, 1)

    expect(document.getElementById('packPrice').textContent).toBe('$620')
  })

  it('does not throw when ctaPrice is missing', () => {
    expect(() => selectPack(PACKS, 0)).not.toThrow()
  })

  it('does not throw when orderLink2 is missing', () => {
    expect(() => selectPack(PACKS, 2)).not.toThrow()
  })

  it('updates packPrice with shimmer removed', () => {
    selectPack(PACKS, 1)

    var el = document.getElementById('packPrice')
    expect(el.classList.contains('loading-shimmer')).toBe(false)
    expect(el.classList.contains('loading-shimmer--lg')).toBe(false)
  })

  it('sets packDesc, packSticks, packWeight correctly', () => {
    selectPack(PACKS, 2)

    expect(document.getElementById('packDesc').textContent).toBe('Maximum reach.')
    expect(document.getElementById('packSticks').textContent).toBe('5')
    expect(document.getElementById('packWeight').textContent).toBe('4 lb 1 oz')
  })

  it('updates orderLink href', () => {
    selectPack(PACKS, 0)

    expect(document.getElementById('orderLink').href).toContain('/checkout.html?pack=1')
  })

  it('works when ctaPrice and orderLink2 DO exist', () => {
    document.body.innerHTML += `
      <span id="ctaPrice"></span>
      <a id="orderLink2" href="#">Checkout 2</a>
    `

    selectPack(PACKS, 1)

    expect(document.getElementById('packPrice').textContent).toBe('$620')
    expect(document.getElementById('ctaPrice').textContent).toBe('$620')
    expect(document.getElementById('orderLink2').href).toContain('/checkout.html?pack=2')
  })
})
