/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPackDetails, findPack,
  calculateWeight, formatWeight,
} from '../assets/js/pack-details.js'

const MOCK_PACKS = [
  { sku: 'mach-one-3-pack-16-inch', name: '3-Pack', size: 16, sticks: 3 },
  { sku: 'mach-one-3-pack-20-inch', name: '3-Pack', size: 20, sticks: 3 },
  { sku: 'mach-one-4-pack-16-inch', name: '4-Pack', size: 16, sticks: 4 },
  { sku: 'mach-one-4-pack-20-inch', name: '4-Pack', size: 20, sticks: 4 },
  { sku: 'mach-one-5-pack-16-inch', name: '5-Pack', size: 16, sticks: 5 },
  { sku: 'mach-one-5-pack-20-inch', name: '5-Pack', size: 20, sticks: 5 },
]

beforeEach(() => {
  document.body.innerHTML = `<script id="pack-data" type="application/json">${JSON.stringify(MOCK_PACKS)}</script>`
})

describe('getPackDetails', () => {
  it('returns pack data from DOM', () => {
    const details = getPackDetails()
    expect(details).toHaveLength(6)
    expect(details[0].sku).toBe('mach-one-3-pack-16-inch')
  })

  it('returns empty array when pack-data element is missing', () => {
    document.body.innerHTML = ''
    expect(getPackDetails()).toEqual([])
  })
})

describe('findPack', () => {
  it('finds a pack by sticks and size', () => {
    const pack = findPack(MOCK_PACKS, 4, 16)
    expect(pack.sku).toBe('mach-one-4-pack-16-inch')
  })

  it('returns undefined when no match', () => {
    expect(findPack(MOCK_PACKS, 6, 16)).toBeUndefined()
  })
})

describe('calculateWeight', () => {
  it('returns lb and oz for multiple sticks', () => {
    const w = calculateWeight(13, 4)
    expect(w.lb).toBe(3)
    expect(w.oz).toBe(4)
  })

  it('returns oz only when under 16 oz total', () => {
    const w = calculateWeight(13, 1)
    expect(w.lb).toBe(0)
    expect(w.oz).toBe(13)
  })

  it('handles exact pound boundary', () => {
    const w = calculateWeight(16, 1)
    expect(w.lb).toBe(1)
    expect(w.oz).toBe(0)
  })

  it('rounds fractional ounces', () => {
    const w = calculateWeight(13.5, 3)
    expect(w.oz).toBe(Math.round(13.5 * 3 % 16))
  })

  it('calculates 3-pack 16-inch correctly', () => {
    const w = calculateWeight(13, 3)
    expect(w.lb).toBe(2)
    expect(w.oz).toBe(7)
  })

  it('calculates 5-pack 20-inch correctly', () => {
    const w = calculateWeight(14.5, 5)
    expect(w.lb).toBe(4)
    expect(w.oz).toBe(Math.round(14.5 * 5 % 16))
  })
})

describe('formatWeight', () => {
  it('formats lb and oz when lb > 0', () => {
    expect(formatWeight(3, 4)).toBe('3 lb 4 oz')
  })

  it('formats oz only when lb is 0', () => {
    expect(formatWeight(0, 13)).toBe('13 oz')
  })

  it('formats exact pound as "1 lb 0 oz"', () => {
    expect(formatWeight(1, 0)).toBe('1 lb 0 oz')
  })
})
