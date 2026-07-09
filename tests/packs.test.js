/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PACK_DETAILS } from '../assets/js/pack-details.js'
import {
  fetchPacks, resetPacksCache,
  getSpecsHtml, renderStickIcons,
} from '../assets/js/packs.js'

afterEach(() => {
  vi.restoreAllMocks()
  resetPacksCache()
})

describe('PACK_DETAILS', () => {
  it('has three packs with static specs and no prices', () => {
    expect(PACK_DETAILS).toHaveLength(3)
    expect(PACK_DETAILS[0].sku).toBe('mach-one-3-pack')
    expect(PACK_DETAILS[0].name).toBe('3-Pack')
    expect(PACK_DETAILS[0].sticks).toBe(3)
    expect(PACK_DETAILS[0].weight).toBe('2 lb 7 oz')
    expect(PACK_DETAILS[0].climb).toBe('~12 ft')
    expect(PACK_DETAILS[0]).not.toHaveProperty('price')
    expect(PACK_DETAILS[1].sku).toBe('mach-one-4-pack')
    expect(PACK_DETAILS[1].sticks).toBe(4)
    expect(PACK_DETAILS[2].sku).toBe('mach-one-5-pack')
    expect(PACK_DETAILS[2].sticks).toBe(5)
  })
})

describe('resetPacksCache', () => {
  it('clears the cached packs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { sku: 'mach-one-3-pack', price: 495, stripePriceId: 'price_a' },
        { sku: 'mach-one-4-pack', price: 590, stripePriceId: 'price_b' },
        { sku: 'mach-one-5-pack', price: 750, stripePriceId: 'price_c' },
      ]),
    })

    await fetchPacks()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    resetPacksCache()

    await fetchPacks()
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('fetchPacks', () => {
  const MOCK_PRICES = [
    { sku: 'mach-one-3-pack', price: 495, stripePriceId: 'price_a' },
    { sku: 'mach-one-4-pack', price: 590, stripePriceId: 'price_b' },
    { sku: 'mach-one-5-pack', price: 750, stripePriceId: 'price_c' },
  ]

  it('returns packs with prices merged from API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PRICES),
    })

    const packs = await fetchPacks()

    expect(packs).toHaveLength(3)
    expect(packs[0].sku).toBe('mach-one-3-pack')
    expect(packs[0].price).toBe(495)
    expect(packs[0].stripePriceId).toBe('price_a')
    expect(packs[0].sticks).toBe(3)
    expect(packs[0].weight).toBe('2 lb 7 oz')
    expect(packs[1].price).toBe(590)
    expect(packs[2].price).toBe(750)
  })

  it('returns cached result on subsequent calls', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PRICES),
    })

    await fetchPacks()
    await fetchPacks()
    await fetchPacks()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(fetchPacks()).rejects.toThrow('Failed to load pricing')
  })

  it('throws on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchPacks()).rejects.toThrow('Network error')
  })

  it('throws when a pack SKU has no matching price', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { sku: 'mach-one-3-pack', price: 495, stripePriceId: 'price_a' },
        { sku: 'mach-one-5-pack', price: 750, stripePriceId: 'price_c' },
      ]),
    })

    await expect(fetchPacks()).rejects.toThrow('Pricing unavailable for 4-Pack')
  })
})

describe('getSpecsHtml', () => {
  it('returns HTML list items for a pack', () => {
    const pack = { sticks: 4, weight: '3 lb 4 oz', climb: '~16 ft' }
    const html = getSpecsHtml(pack)
    expect(html).toContain('>4<')
    expect(html).toContain('carbon fiber sticks')
    expect(html).toContain('3 lb 4 oz')
    expect(html).toContain('~16 ft')
    expect(html).toContain('Daisy chain rope attachment')
    expect(html).toMatch(/^<li>/)
    expect(html).toMatch(/<\/li>$/u)
  })
})

describe('renderStickIcons', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>'
  })

  it('renders the correct number of stick icons', () => {
    const container = document.getElementById('container')
    renderStickIcons(container, 4, 'stick-icon')
    expect(container.children.length).toBe(4)
    Array.from(container.children).forEach(el => {
      expect(el.className).toBe('stick-icon')
      expect(el.tagName).toBe('SPAN')
    })
  })

  it('replaces existing content', () => {
    const container = document.getElementById('container')
    container.innerHTML = '<span>old</span>'
    renderStickIcons(container, 2, 'icon')
    expect(container.children.length).toBe(2)
    expect(container.textContent).not.toContain('old')
  })
})
