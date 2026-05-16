import { supabase } from './supabase'
import type { MenuItem, KitchenOrder, Alert, Reservation, QueueItem, Table, Offer, AdminNotification, StockItem, Session, Rating } from '../types/index'

// ─── Row mappers ─────────────────────────────────────────────
const mapMenuItem  = (r: any): MenuItem  => ({ id: r.id, name: r.name, desc: r.description, price: r.price, category: r.category, emoji: r.emoji, hot: r.hot ?? false })
const mapOrder     = (r: any): KitchenOrder => ({ id: r.id, table: r.table_ref, items: r.items, time: r.time, status: r.status, createdAt: r.created_at, sessionId: r.session_id ?? undefined, total: r.total ?? 0 })
export const mapAlert = (r: any): Alert  => ({ id: r.id, table: r.table_ref, type: r.type, emoji: r.emoji, time: r.time })
export const mapTable = (r: any): Table  => ({ n: r.n, s: r.status, floor: r.floor ?? 1, label: r.label ?? '', capacity: r.capacity ?? 4, currentSessionId: r.current_session_id ?? null })
export const mapOffer = (r: any): Offer  => ({ id: r.id, title: r.title, desc: r.description, active: r.active })
const mapNotif     = (r: any): AdminNotification => ({ table: r.table_ref, message: r.message, time: r.time, color: r.color })
const mapResv      = (r: any): Reservation => ({ id: r.id, time: r.time, table: r.table_ref, name: r.name, confirmed: r.confirmed, guests: r.guests ?? 2, phone: r.phone ?? '', notes: r.notes ?? '', section: r.section ?? '' })
const mapQueue     = (r: any): QueueItem => ({ id: r.id, table: r.table_ref, items: r.items, waiter: r.waiter, status: r.status })
const mapSession   = (r: any): Session   => ({ id: r.id, tableId: r.table_id, startedAt: r.started_at, closedAt: r.closed_at, total: r.total ?? 0, paid: r.paid ?? false })
const mapRating    = (r: any): Rating    => ({ id: r.id, sessionId: r.session_id, tableId: r.table_id, food: r.food, service: r.service, overall: r.overall, comment: r.comment ?? '', createdAt: r.created_at })
const mapStockItem = (r: any): StockItem => ({ id: r.id, name: r.name, current: Number(r.current), minimum: Number(r.minimum), unit: r.unit })

function nowStr(): string {
  const d = new Date()
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function minutesAgo(createdAt: string | undefined): number {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

// ─── API ─────────────────────────────────────────────────────
export const api = {

  // ── Menu ────────────────────────────────────────────────────
  getMenu: async (): Promise<MenuItem[]> => {
    const { data } = await supabase.from('menu_items').select('*').order('id')
    return (data ?? []).map(mapMenuItem)
  },

  addMenuItem: async (item: { name: string; price: number; category: string; emoji: string; description: string; hot?: boolean }): Promise<MenuItem> => {
    const { data, error } = await supabase.from('menu_items').insert({
      name: item.name, price: item.price, category: item.category,
      emoji: item.emoji, description: item.description, hot: item.hot ?? false,
    }).select().single()
    if (error) throw error
    return mapMenuItem(data)
  },

  updateMenuItem: async (id: number, updates: Partial<{ name: string; price: number; description: string; emoji: string; hot: boolean }>): Promise<MenuItem> => {
    const { data, error } = await supabase.from('menu_items').update(updates).eq('id', id).select().single()
    if (error) throw error
    return mapMenuItem(data)
  },

  deleteMenuItem: async (id: number): Promise<void> => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
  },

  // ── Sessions ────────────────────────────────────────────────
  getActiveSession: async (tableId: number): Promise<Session | null> => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('table_id', tableId)
      .is('closed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ? mapSession(data) : null
  },

  openSession: async (tableId: number): Promise<Session> => {
    // Reuse existing open session if one exists
    const existing = await api.getActiveSession(tableId)
    if (existing) return existing
    const id = `#S${Date.now()}`
    const { data, error } = await supabase
      .from('sessions')
      .insert({ id, table_id: tableId })
      .select().single()
    if (error) throw error
    await supabase.from('restaurant_tables').update({ current_session_id: id, status: 'e' }).eq('n', tableId)
    return mapSession(data)
  },

  closeSession: async (sessionId: string, total: number): Promise<void> => {
    const { data } = await supabase.from('sessions').select('table_id').eq('id', sessionId).single()
    await supabase.from('sessions').update({ closed_at: new Date().toISOString(), total, paid: true }).eq('id', sessionId)
    if (data) {
      await supabase.from('restaurant_tables').update({ current_session_id: null, status: 'g' }).eq('n', data.table_id)
    }
  },

  // ── Orders ──────────────────────────────────────────────────
  getOrders: async (): Promise<KitchenOrder[]> => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    return (data ?? []).map(mapOrder)
  },

  placeOrder: async (items: string, table: string, sessionId?: string, total?: number): Promise<KitchenOrder> => {
    const id = `#${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(-2).toUpperCase()}`
    const tableNum = parseInt(table.replace('T', '')) || 0
    const { data, error } = await supabase
      .from('orders')
      .insert({ id, table_ref: table, items, time: nowStr(), status: 'new', session_id: sessionId ?? null, total: total ?? 0 })
      .select().single()
    if (error) throw error
    await supabase.from('restaurant_tables').update({ status: 'e' }).eq('n', tableNum)
    await supabase.from('notifications').insert({ table_ref: String(tableNum), message: `طلب جديد ${id}`, time: 'الآن', color: '#DCA95C' })
    return mapOrder(data)
  },

  markOrderReady: async (id: string): Promise<KitchenOrder> => {
    const { data, error } = await supabase.from('orders').update({ status: 'ready' }).eq('id', id).select().single()
    if (error) throw error
    return mapOrder(data)
  },

  getOrderMinutesAgo: (order: KitchenOrder): number => minutesAgo(order.createdAt),

  // ── Alerts ──────────────────────────────────────────────────
  getAlerts: async (): Promise<Alert[]> => {
    const { data } = await supabase.from('alerts').select('*').order('created_at')
    return (data ?? []).map(mapAlert)
  },

  sendAlert: async (table: string, type: string, emoji: string): Promise<Alert> => {
    const tableId = parseInt(table.replace('T', '')) || null
    const { data, error } = await supabase
      .from('alerts')
      .insert({ table_ref: table, type, emoji, time: nowStr(), table_id: tableId })
      .select().single()
    if (error) throw error
    await supabase.from('notifications').insert({ table_ref: table.replace('T', ''), message: `نداء: ${type}`, time: 'الآن', color: '#E8A020' })
    return mapAlert(data)
  },

  dismissAlert: async (id: number): Promise<void> => {
    await supabase.from('alerts').delete().eq('id', id)
  },

  // ── Reservations & Queue ─────────────────────────────────────
  getReservations: async (): Promise<Reservation[]> => {
    const { data } = await supabase.from('reservations').select('*').order('time')
    return (data ?? []).map(mapResv)
  },

  createReservation: async (r: { firstName: string; lastName: string; phone: string; date: string; time: string; guests: number; section: string; notes: string; tableRef?: string }): Promise<Reservation> => {
    const name = `${r.firstName} ${r.lastName}`.trim()

    // If caller passes a specific table (e.g. CustomerView), use it.
    // Otherwise find a random free table from the DB.
    let tableRef: string
    if (r.tableRef) {
      tableRef = r.tableRef
    } else {
      const { data: freeTables } = await supabase
        .from('restaurant_tables')
        .select('n')
        .eq('status', 'g')
      if (!freeTables || freeTables.length === 0) {
        throw new Error('لا توجد طاولات فارغة متاحة')
      }
      const pick = freeTables[Math.floor(Math.random() * freeTables.length)]
      tableRef = `T${pick.n}`
    }
    const tableN = tableRef.replace('T', '')

    // Combine date + time so the record is filterable by date later
    const dateStr  = r.date || new Date().toISOString().split('T')[0]
    const timeStr  = r.time || '12:00'
    const combined = `${dateStr} ${timeStr}`
    const payload  = { name, table_ref: tableRef, time: combined, confirmed: true, guests: r.guests, phone: r.phone, notes: r.notes }
    const { data, error } = await supabase
      .from('reservations')
      .insert(payload)
      .select().single()
    if (error) throw error
    await supabase.from('notifications').insert({ table_ref: tableN, message: `حجز مؤكد — ${name}`, time: 'الآن', color: '#4CAF50' })
    return mapResv(data)
  },

  cancelReservation: async (id: number): Promise<void> => {
    await supabase.from('reservations').delete().eq('id', id)
  },

  getQueue: async (): Promise<QueueItem[]> => {
    const { data } = await supabase.from('queue').select('*')
    return (data ?? []).map(mapQueue)
  },

  // ── Tables ──────────────────────────────────────────────────
  getTables: async (): Promise<Table[]> => {
    const { data } = await supabase.from('restaurant_tables').select('*').order('n')
    return (data ?? []).map(mapTable)
  },

  addTable: async (n: number, floor: number, label: string, capacity: number): Promise<Table> => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({ n, status: 'g', floor, label, capacity })
      .select().single()
    if (error) throw error
    return mapTable(data)
  },

  updateTable: async (n: number): Promise<Table> => {
    const { data: cur } = await supabase.from('restaurant_tables').select('status').eq('n', n).single()
    const cycle: Record<string, string> = { g: 'e', e: 'f', f: 'g' }
    const next = cycle[cur?.status ?? 'f'] ?? 'g'
    const { data, error } = await supabase.from('restaurant_tables').update({ status: next }).eq('n', n).select().single()
    if (error) throw error
    return mapTable(data)
  },

  updateTableStatus: async (n: number, status: 'g' | 'e' | 'f'): Promise<Table> => {
    const { data, error } = await supabase.from('restaurant_tables').update({ status }).eq('n', n).select().single()
    if (error) throw error
    return mapTable(data)
  },

  updateTableMeta: async (n: number, updates: Partial<{ floor: number; label: string; capacity: number }>): Promise<Table> => {
    const { data, error } = await supabase.from('restaurant_tables').update(updates).eq('n', n).select().single()
    if (error) throw error
    return mapTable(data)
  },

  // ── Offers ──────────────────────────────────────────────────
  getOffers: async (): Promise<Offer[]> => {
    const { data } = await supabase.from('offers').select('*').order('id')
    return (data ?? []).map(mapOffer)
  },

  toggleOffer: async (id: number): Promise<Offer> => {
    const { data: cur } = await supabase.from('offers').select('active').eq('id', id).single()
    const { data, error } = await supabase.from('offers').update({ active: !cur?.active }).eq('id', id).select().single()
    if (error) throw error
    return mapOffer(data)
  },

  addOffer: async (title: string, description: string): Promise<Offer> => {
    const { data, error } = await supabase.from('offers').insert({ title, description, active: true }).select().single()
    if (error) throw error
    return mapOffer(data)
  },

  deleteOffer: async (id: number): Promise<void> => {
    await supabase.from('offers').delete().eq('id', id)
  },

  // ── Bill & Notes ─────────────────────────────────────────────
  requestBill: async (table: string): Promise<void> => {
    const n = parseInt(table.replace('T', ''))
    await supabase.from('restaurant_tables').update({ status: 'f' }).eq('n', n)
    await supabase.from('notifications').insert({ table_ref: String(n), message: 'طلب الحساب', time: 'الآن', color: '#E24B4A' })
  },

  sendNote: async (table: string, note: string): Promise<void> => {
    await supabase.from('notifications').insert({ table_ref: table.replace('T', ''), message: `ملاحظة: ${note.slice(0, 30)}`, time: 'الآن', color: '#4CAF50' })
  },

  // ── Ratings — now uses the dedicated ratings table ───────────
  submitRating: async (food: number, service: number, overall: number, comment: string, tableId: number, sessionId?: string): Promise<void> => {
    const { error } = await supabase.from('ratings').insert({
      table_id: tableId,
      session_id: sessionId ?? null,
      food,
      service,
      overall,
      comment: comment.trim(),
    })
    if (error) throw error
  },

  getRatings: async (): Promise<Rating[]> => {
    const { data } = await supabase.from('ratings').select('*').order('created_at', { ascending: false }).limit(50)
    return (data ?? []).map(mapRating)
  },

  // ── Stock — now uses the stock_items Supabase table ──────────
  getStock: async (): Promise<StockItem[]> => {
    const { data } = await supabase.from('stock_items').select('*').order('id')
    if (data && data.length > 0) return data.map(mapStockItem)
    // Seed default items on first use
    const defaults = [
      { name: 'جبنة موزاريلا', current: 3.5, minimum: 4,  unit: 'كغ' },
      { name: 'زيت زيتون',     current: 1.5, minimum: 5,  unit: 'لتر' },
      { name: 'جبن كريمي',     current: 2,   minimum: 3,  unit: 'كغ' },
      { name: 'دقيق',           current: 12,  minimum: 10, unit: 'كغ' },
      { name: 'طماطم',          current: 8,   minimum: 5,  unit: 'كغ' },
      { name: 'لحم بقري',       current: 5,   minimum: 4,  unit: 'كغ' },
    ]
    const { data: seeded } = await supabase.from('stock_items').insert(defaults).select()
    return (seeded ?? []).map(mapStockItem)
  },

  addStockItem: async (item: Omit<StockItem, 'id'>): Promise<StockItem> => {
    const { data, error } = await supabase
      .from('stock_items')
      .insert({ name: item.name, current: item.current, minimum: item.minimum, unit: item.unit })
      .select().single()
    if (error) throw error
    return mapStockItem(data)
  },

  updateStockItem: async (id: number, updates: Partial<Omit<StockItem, 'id'>>): Promise<StockItem> => {
    const { data, error } = await supabase
      .from('stock_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select().single()
    if (error) throw error
    return mapStockItem(data)
  },

  deleteStockItem: async (id: number): Promise<void> => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id)
    if (error) throw error
  },

  // ── Admin bundle ─────────────────────────────────────────────
  getAdminData: async () => {
    const AVG_ORDER = 15000
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

    // Today and 7-day window
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

    const [{ data: notifData }, { data: ordersData }] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('orders').select('id, created_at, total, items').gte('created_at', weekStart.toISOString()).order('created_at', { ascending: false }),
    ])

    const todayOrders = (ordersData ?? []).filter(o => new Date(o.created_at) >= todayStart)
    const thisHour    = (ordersData ?? []).filter(o => (Date.now() - new Date(o.created_at).getTime()) < 3_600_000).length

    // Real today revenue (fallback to AVG if total=0)
    const revenue = todayOrders.reduce((sum, o) => sum + ((o.total && o.total > 0) ? o.total : AVG_ORDER), 0)

    // Weekly sales per day (in millions IQD)
    const dailyRev: Record<string, number> = {}
    ;(ordersData ?? []).forEach(o => {
      const day = dayNames[new Date(o.created_at).getDay()]
      dailyRev[day] = (dailyRev[day] ?? 0) + ((o.total && o.total > 0) ? o.total : AVG_ORDER)
    })
    const weeklySales = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const day = dayNames[d.getDay()]
      return { day, val: parseFloat(((dailyRev[day] ?? 0) / 1_000_000).toFixed(2)) }
    })

    // Top items — keyword scan of items text
    const catCounts: Record<string, number> = { 'صاج': 0, 'بيتزا': 0, 'موك': 0, 'أخرى': 0 }
    const catColors: Record<string, string>  = { 'صاج': '#DCA95C', 'بيتزا': '#4CAF50', 'موك': '#378ADD', 'أخرى': '#E8A020' }
    ;(ordersData ?? []).forEach(o => {
      const t = o.items ?? ''
      if (/صاج/.test(t))                         catCounts['صاج']++
      else if (/بيتزا|pizza/i.test(t))           catCounts['بيتزا']++
      else if (/موك|مشروب|عصير|شاي|كولا/i.test(t)) catCounts['موك']++
      else                                         catCounts['أخرى']++
    })
    const catTotal = Object.values(catCounts).reduce((s, c) => s + c, 0) || 1
    let topItems = Object.entries(catCounts)
      .filter(([, c]) => c > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / catTotal) * 100), color: catColors[name] }))
    if (topItems.length === 0) {
      topItems = [
        { name: 'صاج', count: 42, pct: 42, color: '#DCA95C' },
        { name: 'بيتزا', count: 28, pct: 28, color: '#4CAF50' },
        { name: 'موك', count: 18, pct: 18, color: '#378ADD' },
        { name: 'أخرى', count: 12, pct: 12, color: '#E8A020' },
      ]
    }

    return {
      stats: {
        ordersToday: todayOrders.length,
        ordersThisHour: thisHour,
        activeTables: 9,
        totalTables: 15,
        revenue,
        revenueGrowth: 12,
        rating: 4.8,
      },
      notifications: (notifData ?? []).map(mapNotif),
      topItems,
      hourlyVols: [2, 1, 3, 7, 20, 38, 55, 60, 48, 62, 45, 28, 18, 12, 8, 5, 3, 2, 5, 18, 42, 58, 62, 38],
      weeklySales,
    }
  },

  // ── Sales data ───────────────────────────────────────────────
  getSalesData: async (): Promise<{
    week: { day: string; val: number; orders: number }[]
    today: { ordersCount: number; revenue: number; activeOrders: number }
    topItems: { name: string; count: number; pct: number; color: string }[]
  }> => {
    const dayNames   = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const COLORS     = ['#DCA95C', '#4CAF50', '#378ADD', '#E8A020']
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

    const [{ data: weekData }, { count: activeCount }] = await Promise.all([
      supabase
        .from('orders')
        .select('created_at, total, items')
        .gte('created_at', weekStart.toISOString())
        .order('created_at'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'ready']),
    ])

    const rows        = weekData ?? []
    const todayOrders = rows.filter(o => new Date(o.created_at) >= todayStart)

    // Per-day buckets keyed by YYYY-MM-DD
    const dayMap: Record<string, { val: number; count: number }> = {}
    for (const o of rows) {
      const key = new Date(o.created_at).toISOString().split('T')[0]
      if (!dayMap[key]) dayMap[key] = { val: 0, count: 0 }
      dayMap[key].val   += o.total > 0 ? o.total : 0
      dayMap[key].count += 1
    }
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      return { day: dayNames[d.getDay()], val: dayMap[key]?.val ?? 0, orders: dayMap[key]?.count ?? 0 }
    })

    // Top items — parse "ItemName(qty)، ..." strings
    const itemCount: Record<string, number> = {}
    for (const o of rows) {
      if (!o.items) continue
      for (const part of o.items.split(/[،,]/)) {
        const name = part.trim().replace(/\(\d+\)/g, '').trim()
        if (name) itemCount[name] = (itemCount[name] ?? 0) + 1
      }
    }
    const countTotal = Object.values(itemCount).reduce((s, c) => s + c, 0) || 1
    const topItems = Object.entries(itemCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, count], i) => ({ name, count, pct: Math.round((count / countTotal) * 100), color: COLORS[i] ?? '#999' }))

    return {
      week,
      today: {
        ordersCount:  todayOrders.length,
        revenue:      todayOrders.reduce((s, o) => s + (o.total > 0 ? o.total : 0), 0),
        activeOrders: activeCount ?? 0,
      },
      topItems,
    }
  },

  getOrdersSince: async (since: string): Promise<{ id: string; items: string; time: string }[]> => {
    const { data } = await supabase.from('orders').select('id, items, time, created_at').gte('created_at', since).order('created_at')
    return (data ?? []).map((r: any) => ({ id: r.id, items: r.items, time: r.time }))
  },

  // ── POS order ────────────────────────────────────────────────
  placePosOrder: async (items: string, table: string, total: number): Promise<void> => {
    const id = `#${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(-2).toUpperCase()}`
    const tableNum = parseInt(table.replace('T', '')) || 0
    await supabase.from('orders').insert({ id, table_ref: table, items, time: nowStr(), status: 'new', total })
    await supabase.from('restaurant_tables').update({ status: 'e' }).eq('n', tableNum)
    await supabase.from('notifications').insert({ table_ref: table.replace('T', ''), message: `POS طلب ${id} — ${total.toLocaleString()} د.ع`, time: 'الآن', color: '#DCA95C' })
  },
}
