import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'
import type { MenuItem } from '../types/index'

const mockItem: MenuItem = {
  id: 1,
  name: 'صاج برايم',
  desc: 'ستيك مشوي',
  price: 8500,
  category: 'm',
  emoji: '🥩',
}

const mockItem2: MenuItem = {
  id: 2,
  name: 'حمص',
  desc: 'حمص طازج',
  price: 2500,
  category: 's',
  emoji: '🧆',
}

describe('useStore — cart', () => {
  beforeEach(() => {
    useStore.setState({ cart: {}, posCart: {} })
  })

  it('adds item to cart', () => {
    useStore.getState().setCartQty(mockItem, 1)
    expect(useStore.getState().cart[1]).toEqual({ item: mockItem, qty: 1 })
  })

  it('increments quantity when adding same item twice', () => {
    useStore.getState().setCartQty(mockItem, 1)
    useStore.getState().setCartQty(mockItem, 1)
    expect(useStore.getState().cart[1].qty).toBe(2)
  })

  it('removes item from cart when quantity reaches zero', () => {
    useStore.getState().setCartQty(mockItem, 1)
    useStore.getState().setCartQty(mockItem, -1)
    expect(useStore.getState().cart[1]).toBeUndefined()
  })

  it('does not allow negative quantities', () => {
    useStore.getState().setCartQty(mockItem, -1)
    expect(useStore.getState().cart[1]).toBeUndefined()
  })

  it('clears all cart items', () => {
    useStore.getState().setCartQty(mockItem, 2)
    useStore.getState().setCartQty(mockItem2, 3)
    useStore.getState().clearCart()
    expect(Object.keys(useStore.getState().cart)).toHaveLength(0)
  })

  it('handles multiple different items independently', () => {
    useStore.getState().setCartQty(mockItem, 2)
    useStore.getState().setCartQty(mockItem2, 1)
    expect(useStore.getState().cart[1].qty).toBe(2)
    expect(useStore.getState().cart[2].qty).toBe(1)
  })
})

describe('useStore — posCart', () => {
  beforeEach(() => {
    useStore.setState({ cart: {}, posCart: {} })
  })

  it('adds item to posCart independently from cart', () => {
    useStore.getState().setPosCartQty(mockItem, 1)
    expect(useStore.getState().posCart[1]).toEqual({ item: mockItem, qty: 1 })
    expect(useStore.getState().cart[1]).toBeUndefined()
  })

  it('clears posCart without affecting cart', () => {
    useStore.getState().setCartQty(mockItem, 1)
    useStore.getState().setPosCartQty(mockItem, 2)
    useStore.getState().clearPosCart()
    expect(useStore.getState().posCart[1]).toBeUndefined()
    expect(useStore.getState().cart[1].qty).toBe(1)
  })
})

describe('useStore — navigation', () => {
  it('sets active tab', () => {
    useStore.getState().setActiveTab('kitchen')
    expect(useStore.getState().activeTab).toBe('kitchen')
  })

  it('sets admin sub tab', () => {
    useStore.getState().setAdminSub('sales')
    expect(useStore.getState().adminSub).toBe('sales')
  })

  it('sets customer tab index', () => {
    useStore.getState().setCustomerTab(3)
    expect(useStore.getState().customerTab).toBe(3)
  })
})
