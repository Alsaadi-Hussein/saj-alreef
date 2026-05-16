import { describe, it, expect } from 'vitest'
import { mapAlert, mapTable, mapOffer } from '../lib/api'

describe('mapAlert', () => {
  it('maps database row to Alert shape', () => {
    const row = { id: 1, table_ref: 'T5', type: 'ماء', emoji: '💧', time: '14:30' }
    const result = mapAlert(row)
    expect(result).toEqual({ id: 1, table: 'T5', type: 'ماء', emoji: '💧', time: '14:30' })
  })

  it('maps table_ref correctly (not table field)', () => {
    const row = { id: 2, table_ref: 'T12', type: 'نادل', emoji: '👨‍🍽️', time: '09:00' }
    expect(mapAlert(row).table).toBe('T12')
  })
})

describe('mapTable', () => {
  it('maps database row to Table shape with defaults', () => {
    const row = { n: 3, status: 'g' }
    const result = mapTable(row)
    expect(result.n).toBe(3)
    expect(result.s).toBe('g')
    expect(result.floor).toBe(1)
    expect(result.label).toBe('')
    expect(result.capacity).toBe(4)
    expect(result.currentSessionId).toBeNull()
  })

  it('maps table with all fields provided', () => {
    const row = { n: 7, status: 'e', floor: 2, label: 'VIP', capacity: 6, current_session_id: '#S123' }
    const result = mapTable(row)
    expect(result.floor).toBe(2)
    expect(result.label).toBe('VIP')
    expect(result.capacity).toBe(6)
    expect(result.currentSessionId).toBe('#S123')
  })

  it('maps all three status values correctly', () => {
    expect(mapTable({ n: 1, status: 'g' }).s).toBe('g')
    expect(mapTable({ n: 2, status: 'e' }).s).toBe('e')
    expect(mapTable({ n: 3, status: 'f' }).s).toBe('f')
  })
})

describe('mapOffer', () => {
  it('maps database row to Offer shape', () => {
    const row = { id: 1, title: 'Happy Hour', description: 'خصم 20%', active: true }
    const result = mapOffer(row)
    expect(result).toEqual({ id: 1, title: 'Happy Hour', desc: 'خصم 20%', active: true })
  })

  it('maps description field to desc (not description)', () => {
    const row = { id: 2, title: 'عرض الغداء', description: 'طبق + مشروب', active: false }
    expect(mapOffer(row).desc).toBe('طبق + مشروب')
    expect((mapOffer(row) as any).description).toBeUndefined()
  })
})
