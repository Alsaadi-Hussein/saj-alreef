import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
})

app.use(cors())
app.use(express.json())

// ─── In-memory store ────────────────────────────────────────────────────────

const store = {
  menu: [
    { id: 1, name: 'صاج برايم',   desc: 'ستيك مشوي بصلصة الريف الأصيلة',  price: 8500, category: 'm',  emoji: '🥩', hot: true },
    { id: 2, name: 'صاج دجاج',    desc: 'دجاج مشوي مع خضار طازجة',          price: 6500, category: 'm',  emoji: '🍗' },
    { id: 3, name: 'بيتزا الريف', desc: 'بيتزا طازجة بجبن موزاريلا',        price: 7000, category: 'm',  emoji: '🍕' },
    { id: 4, name: 'حمص طازج',    desc: 'مع زيت زيتون وبابريكا',             price: 2500, category: 's',  emoji: '🧆' },
    { id: 5, name: 'سلطة الريف',  desc: 'خضار طازجة مع ليمون وزيتون',       price: 2000, category: 's',  emoji: '🥗' },
    { id: 6, name: 'شاي عراقي',   desc: 'بالهيل والزعفران الطازج',           price: 1000, category: 'd',  emoji: '🍵' },
    { id: 7, name: 'عصير طازج',   desc: 'مشكل يومي طازج',                   price: 2000, category: 'd',  emoji: '🥤' },
    { id: 8, name: 'بقلاوة',      desc: 'مكسرات وعسل طبيعي أصيل',           price: 2500, category: 'sw', emoji: '🍯' },
  ],

  orders: [
    { id: '#212', table: 'T8',  items: 'صاج برايم (1)، بطاطا (2)',   time: '14:35', status: 'new'   },
    { id: '#213', table: 'T5',  items: 'بيتزا (1)، سلطة (1)',         time: '14:38', status: 'new'   },
    { id: '#214', table: 'T6',  items: 'صاج دجاج (2)',                time: '14:42', status: 'ready' },
    { id: '#215', table: 'T2',  items: 'حمص (2)، شاي (3)',            time: '14:45', status: 'new'   },
    { id: '#216', table: 'T11', items: 'بقلاوة (4)، عصير (2)',        time: '14:47', status: 'new'   },
  ] as { id: string; table: string; items: string; time: string; status: string }[],

  alerts: [
    { id: 1, table: '6',  type: 'نادل',    emoji: '👨‍🍽️', time: '7:33' },
    { id: 2, table: '11', type: 'ماء',     emoji: '💧',    time: '7:35' },
    { id: 3, table: '5',  type: 'مناديل', emoji: '🧻',    time: '7:36' },
  ] as { id: number; table: string; type: string; emoji: string; time: string }[],

  reservations: [
    { id: 1, time: '13:00', table: 'T3',  name: 'أحمد علي',    confirmed: true  },
    { id: 2, time: '14:30', table: 'T12', name: 'سارة محمد',   confirmed: true  },
    { id: 3, time: '19:00', table: 'T7',  name: 'محمد حسن',    confirmed: false },
    { id: 4, time: '20:30', table: 'T4',  name: 'فاطمة خالد',  confirmed: false },
  ],

  queue: [
    { id: '#201', table: 'T8', items: 'صاج (1)، بطاطا (2)', waiter: 'أحمد',  status: 'serving'  },
    { id: '#202', table: 'T5', items: 'بيتزا (1)',            waiter: 'نادية', status: 'assigned' },
    { id: '#203', table: 'T3', items: 'حمص (2)',              waiter: 'سامي',  status: 'done'     },
  ],

  tables: [
    { n: 1,  s: 'g' }, { n: 2,  s: 'g' }, { n: 3,  s: 'e' }, { n: 4,  s: 'g' }, { n: 5,  s: 'f' },
    { n: 6,  s: 'g' }, { n: 7,  s: 'e' }, { n: 8,  s: 'g' }, { n: 9,  s: 'g' }, { n: 10, s: 'f' },
    { n: 11, s: 'f' }, { n: 12, s: 'g' }, { n: 13, s: 'f' }, { n: 14, s: 'g' }, { n: 15, s: 'e' },
  ] as { n: number; s: string }[],

  offers: [
    { id: 1, title: 'Happy Hour',    desc: 'خصم 20% — 6-8 مساءً',    active: true  },
    { id: 2, title: 'وجبة العائلة', desc: '4 أشخاص بسعر 3',           active: true  },
    { id: 3, title: 'عرض الغداء',   desc: 'طبق رئيسي + مشروب',       active: false },
    { id: 4, title: 'الجمعة الخاصة',desc: 'خصم 15% للكل',             active: false },
  ] as { id: number; title: string; desc: string; active: boolean }[],

  notifications: [
    { table: '3',  message: 'طلب الحساب',     time: '2 دق.',  color: '#E24B4A' },
    { table: '7',  message: 'طلب جديد #216',  time: '5 دق.',  color: '#DCA95C' },
    { table: '11', message: 'نداء: ماء',       time: '8 دق.',  color: '#E8A020' },
    { table: '9',  message: 'تقييم ★★★★★',   time: '12 دق.', color: '#4CAF50' },
  ] as { table: string; message: string; time: string; color: string }[],

  topItems: [
    { name: 'صاج برايم',   count: 89, pct: 89, color: '#DCA95C' },
    { name: 'بيتزا الريف', count: 72, pct: 72, color: '#4CAF50' },
    { name: 'دجاج مشوي',  count: 55, pct: 55, color: '#378ADD' },
    { name: 'حمص',         count: 41, pct: 41, color: '#E8A020' },
    { name: 'بقلاوة',      count: 28, pct: 28, color: '#BF7A54' },
  ],

  hourlyVols: [2,1,3,7,20,38,55,60,48,62,45,28,18,12,8,5,3,2,5,18,42,58,62,38],

  aiInsights: [
    '💡 "قلّل سعر صاج برايم، الطلب ضعيف هذا الأسبوع"',
    '📈 "دجاج مشوي ترند اليوم — فعّل عرض خاص الآن"',
    '⏰ "ذروة الطلبات 7-9 مساءً — جهّز فريق إضافي"',
  ],

  stats: { ordersToday: 127, ordersThisHour: 18, activeTables: 9, totalTables: 15, revenue: 485000, revenueGrowth: 12, rating: 4.8 },

  nextOrderId: 217,
  nextAlertId: 4,
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/api/menu', (_req, res) => res.json(store.menu))

// Orders
app.get('/api/orders', (_req, res) => res.json(store.orders))
app.post('/api/orders', (req, res) => {
  const { items, table } = req.body as { items: string; table: string }
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  const order = { id: `#${store.nextOrderId++}`, table: table || 'T5', items, time, status: 'new' }
  store.orders.push(order)
  io.emit('order:new', order)
  store.stats.ordersToday++
  store.stats.ordersThisHour++
  store.notifications.unshift({ table: (table || 'T5').replace('T', ''), message: `طلب جديد ${order.id}`, time: 'الآن', color: '#DCA95C' })
  res.status(201).json(order)
})
app.patch('/api/orders/:id/ready', (req, res) => {
  const order = store.orders.find(o => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  order.status = 'ready'
  io.emit('order:ready', order)
  res.json(order)
})

// Alerts
app.get('/api/alerts', (_req, res) => res.json(store.alerts))
app.post('/api/alerts', (req, res) => {
  const { table, type, emoji } = req.body as { table: string; type: string; emoji: string }
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  const alert = { id: store.nextAlertId++, table, type, emoji, time }
  store.alerts.push(alert)
  io.emit('call:new', alert)
  store.notifications.unshift({ table, message: `نداء: ${type}`, time: 'الآن', color: '#E8A020' })
  res.status(201).json(alert)
})
app.delete('/api/alerts/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const idx = store.alerts.findIndex(a => a.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  store.alerts.splice(idx, 1)
  io.emit('call:done', { id })
  res.json({ ok: true })
})

// Reservations & Queue
app.get('/api/reservations', (_req, res) => res.json(store.reservations))
app.get('/api/queue', (_req, res) => res.json(store.queue))

// Tables
app.get('/api/tables', (_req, res) => res.json(store.tables))
app.patch('/api/tables/:n', (req, res) => {
  const n = parseInt(req.params.n)
  const table = store.tables.find(t => t.n === n)
  if (!table) return res.status(404).json({ error: 'Not found' })
  const cycle: Record<string, string> = { g: 'e', e: 'f', f: 'g' }
  table.s = cycle[table.s] ?? 'f'
  io.emit('table:updated', table)
  res.json(table)
})

// Offers
app.get('/api/offers', (_req, res) => res.json(store.offers))
app.patch('/api/offers/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const offer = store.offers.find(o => o.id === id)
  if (!offer) return res.status(404).json({ error: 'Not found' })
  offer.active = !offer.active
  io.emit('offer:toggled', offer)
  res.json(offer)
})
app.post('/api/offers', (req, res) => {
  const { title, desc } = req.body as { title: string; desc: string }
  const offer = { id: Date.now(), title, desc, active: true }
  store.offers.push(offer)
  io.emit('offers:updated', store.offers)
  res.status(201).json(offer)
})

// Bill
app.post('/api/bill', (req, res) => {
  const { table } = req.body as { table: string }
  io.emit('bill:request', { table })
  store.notifications.unshift({ table: (table || 'T5').replace('T', ''), message: 'طلب الحساب', time: 'الآن', color: '#E24B4A' })
  const t = store.tables.find(tb => `T${tb.n}` === table)
  if (t) { t.s = 'e'; io.emit('table:updated', t) }
  res.json({ ok: true })
})

// Note
app.post('/api/note', (req, res) => {
  const { table, note } = req.body as { table: string; note: string }
  io.emit('note:sent', { table, note })
  res.json({ ok: true })
})

// Rating
app.post('/api/rating', (req, res) => {
  const { foodRating, serviceRating, overallRating, comment } = req.body as { foodRating: number; serviceRating: number; overallRating: number; comment: string }
  io.emit('rating:new', { foodRating, serviceRating, overallRating, comment })
  const stars = '★'.repeat(overallRating)
  store.notifications.unshift({ table: '5', message: `تقييم ${stars}`, time: 'الآن', color: '#4CAF50' })
  res.json({ ok: true })
})

// Admin
app.get('/api/admin', (_req, res) => {
  res.json({
    stats: store.stats,
    notifications: store.notifications.slice(0, 10),
    topItems: store.topItems,
    hourlyVols: store.hourlyVols,
    aiInsights: store.aiInsights,
  })
})

// ─── Socket ──────────────────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log('connected:', socket.id)
  socket.on('disconnect', () => console.log('disconnected:', socket.id))
})

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = 3001
httpServer.listen(PORT, () => console.log(`SAJ AL-REEF backend → http://localhost:${PORT}`))
