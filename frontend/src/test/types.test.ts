import { describe, it, expect } from 'vitest'
import type { MenuItem, CartItem, KitchenOrder, Alert, Table, Offer, Session, Rating, StockItem } from '../types/index'

// Type-level smoke tests — verify interfaces have expected fields
describe('Type contracts', () => {
  it('MenuItem has required fields', () => {
    const item: MenuItem = {
      id: 1, name: 'صاج برايم', desc: 'وصف', price: 8500, category: 'm', emoji: '🥩',
    }
    expect(item.id).toBe(1)
    expect(item.category).toBe('m')
  })

  it('MenuItem category only accepts valid values', () => {
    const cats: MenuItem['category'][] = ['m', 's', 'd', 'sw']
    expect(cats).toHaveLength(4)
  })

  it('CartItem links a MenuItem with a quantity', () => {
    const item: MenuItem = { id: 2, name: 'حمص', desc: '', price: 2500, category: 's', emoji: '🧆' }
    const cartItem: CartItem = { item, qty: 3 }
    expect(cartItem.qty).toBe(3)
    expect(cartItem.item.price).toBe(2500)
  })

  it('KitchenOrder has status union type', () => {
    const order: KitchenOrder = {
      id: '#001', table: 'T3', items: 'صاج(1)', time: '14:30', status: 'new',
    }
    expect(['new', 'ready']).toContain(order.status)
  })

  it('Table status uses single-char codes', () => {
    const table: Table = { n: 5, s: 'g', floor: 1, label: '', capacity: 4, currentSessionId: null }
    expect(['g', 'e', 'f']).toContain(table.s)
  })

  it('Session tracks open/closed state via closedAt', () => {
    const openSession: Session = {
      id: '#S001', tableId: 3, startedAt: new Date().toISOString(), closedAt: null, total: 0, paid: false,
    }
    expect(openSession.closedAt).toBeNull()
    expect(openSession.paid).toBe(false)
  })

  it('StockItem tracks current vs minimum quantities', () => {
    const stock: StockItem = { id: 1, name: 'جبنة', current: 2.5, minimum: 4, unit: 'كغ' }
    const isLow = stock.current < stock.minimum
    expect(isLow).toBe(true)
  })

  it('Alert has table and type fields', () => {
    const alert: Alert = { id: 1, table: 'T6', type: 'نادل', emoji: '👨‍🍽️', time: '14:33' }
    expect(alert.table).toBe('T6')
  })

  it('Offer tracks active state', () => {
    const offer: Offer = { id: 1, title: 'Happy Hour', desc: 'خصم 20%', active: true }
    expect(offer.active).toBe(true)
  })

  it('Rating captures food, service, and overall separately', () => {
    const rating: Rating = {
      id: 1, sessionId: null, tableId: 3,
      food: 4, service: 5, overall: 4,
      comment: 'ممتاز', createdAt: new Date().toISOString(),
    }
    expect(rating.food).not.toBe(rating.service)
  })
})
