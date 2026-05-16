import { describe, it, expect } from 'vitest'

// Extracted pure calculation logic from PosView for testability
function parsePrice(p: string): number {
  return parseInt(p.replace(/,/g, '').match(/\d+/)?.[0] ?? '0')
}

function calcDiscount(subtotal: number, discStr: string, discType: 'pct' | 'fixed'): number {
  const discNum = parseFloat(discStr) || 0
  if (discType === 'pct') return Math.round(subtotal * discNum / 100)
  return Math.min(discNum, subtotal)
}

function calcTotal(subtotal: number, discAmt: number): number {
  return subtotal - discAmt
}

describe('parsePrice', () => {
  it('parses plain number string', () => {
    expect(parsePrice('8500')).toBe(8500)
  })

  it('parses number with commas', () => {
    expect(parsePrice('12,500')).toBe(12500)
  })

  it('parses number with currency text', () => {
    expect(parsePrice('8,500 د.ع')).toBe(8500)
  })

  it('returns 0 for non-numeric string', () => {
    expect(parsePrice('مجاني')).toBe(0)
  })

  it('parses first number from range like "5,000-7,000"', () => {
    expect(parsePrice('5,000-7,000')).toBe(5000)
  })
})

describe('calcDiscount', () => {
  it('calculates percentage discount correctly', () => {
    expect(calcDiscount(10000, '20', 'pct')).toBe(2000)
  })

  it('calculates fixed discount correctly', () => {
    expect(calcDiscount(10000, '1500', 'fixed')).toBe(1500)
  })

  it('caps fixed discount at subtotal amount', () => {
    expect(calcDiscount(1000, '5000', 'fixed')).toBe(1000)
  })

  it('returns 0 for empty discount string', () => {
    expect(calcDiscount(10000, '', 'pct')).toBe(0)
  })

  it('handles 100% discount', () => {
    expect(calcDiscount(10000, '100', 'pct')).toBe(10000)
  })

  it('handles decimal percentage (rounding)', () => {
    expect(calcDiscount(10000, '15.5', 'pct')).toBe(1550)
  })
})

describe('calcTotal', () => {
  it('subtracts discount from subtotal', () => {
    expect(calcTotal(10000, 2000)).toBe(8000)
  })

  it('returns 0 when full discount applied', () => {
    expect(calcTotal(5000, 5000)).toBe(0)
  })

  it('returns subtotal when no discount', () => {
    expect(calcTotal(8500, 0)).toBe(8500)
  })
})

describe('cart subtotal calculation', () => {
  type CartItem = { item: { price: number }; qty: number }

  function calcSubtotal(cartItems: CartItem[]): number {
    return cartItems.reduce((s, c) => s + c.item.price * c.qty, 0)
  }

  it('calculates subtotal for single item', () => {
    expect(calcSubtotal([{ item: { price: 8500 }, qty: 2 }])).toBe(17000)
  })

  it('calculates subtotal for multiple items', () => {
    const items = [
      { item: { price: 8500 }, qty: 1 },
      { item: { price: 2500 }, qty: 3 },
    ]
    expect(calcSubtotal(items)).toBe(16000)
  })

  it('returns 0 for empty cart', () => {
    expect(calcSubtotal([])).toBe(0)
  })
})
