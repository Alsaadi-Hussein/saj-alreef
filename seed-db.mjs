const BASE = `${process.env.SUPABASE_URL}/rest/v1`
const KEY  = process.env.SUPABASE_ANON_KEY

const H = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=ignore-duplicates',
}

async function ins(table, rows) {
  const r = await fetch(`${BASE}/${table}`, { method: 'POST', headers: H, body: JSON.stringify(rows) })
  const txt = await r.text()
  if (r.ok || r.status === 201) {
    console.log(`✓ ${table} (${rows.length} rows)`)
  } else {
    console.log(`⚠  ${table}: ${r.status} ${txt}`)
  }
}

// menu_items
await ins('menu_items', [
  { name: 'ساج برايم',   description: 'ستيك مشوي بصلصة الريف الأصيلة',  price: 8500, category: 'm',  emoji: '🥩', hot: true  },
  { name: 'ساج دجاج',    description: 'دجاج مشوي مع خضار طازجة',          price: 6500, category: 'm',  emoji: '🍗', hot: false },
  { name: 'بيتزا الريف', description: 'بيتزا طازجة بجبن موزاريلا',        price: 7000, category: 'm',  emoji: '🍕', hot: false },
  { name: 'حمص طازج',    description: 'مع زيت زيتون وبابريكا',             price: 2500, category: 's',  emoji: '🧆', hot: false },
  { name: 'سلطة الريف',  description: 'خضار طازجة مع ليمون وزيتون',       price: 2000, category: 's',  emoji: '🥗', hot: false },
  { name: 'شاي عراقي',   description: 'بالهيل والزعفران الطازج',           price: 1000, category: 'd',  emoji: '🍵', hot: false },
  { name: 'عصير طازج',   description: 'مشكل يومي طازج',                   price: 2000, category: 'd',  emoji: '🥤', hot: false },
  { name: 'بقلاوة',      description: 'مكسرات وعسل طبيعي أصيل',           price: 2500, category: 'sw', emoji: '🍯', hot: false },
])

// orders
await ins('orders', [
  { id: '#212', table_ref: 'T8',  items: 'ساج برايم (1)، بطاطا (2)', time: '14:35', status: 'new'   },
  { id: '#213', table_ref: 'T5',  items: 'بيتزا (1)، سلطة (1)',      time: '14:38', status: 'new'   },
  { id: '#214', table_ref: 'T6',  items: 'ساج دجاج (2)',             time: '14:42', status: 'ready' },
  { id: '#215', table_ref: 'T2',  items: 'حمص (2)، شاي (3)',         time: '14:45', status: 'new'   },
  { id: '#216', table_ref: 'T11', items: 'بقلاوة (4)، عصير (2)',     time: '14:47', status: 'new'   },
])

// alerts
await ins('alerts', [
  { table_ref: '6',  type: 'نادل',   emoji: '👨‍🍽️', time: '7:33' },
  { table_ref: '11', type: 'ماء',    emoji: '💧',   time: '7:35' },
  { table_ref: '5',  type: 'مناديل', emoji: '🧻',   time: '7:36' },
])

// reservations
await ins('reservations', [
  { time: '13:00', table_ref: 'T3',  name: 'أحمد علي',    confirmed: true  },
  { time: '14:30', table_ref: 'T12', name: 'سارة محمد',   confirmed: true  },
  { time: '19:00', table_ref: 'T7',  name: 'محمد حسن',    confirmed: false },
  { time: '20:30', table_ref: 'T4',  name: 'فاطمة خالد',  confirmed: false },
])

// queue
await ins('queue', [
  { id: '#201', table_ref: 'T8', items: 'ساج (1)، بطاطا (2)', waiter: 'أحمد',  status: 'serving'  },
  { id: '#202', table_ref: 'T5', items: 'بيتزا (1)',           waiter: 'نادية', status: 'assigned' },
  { id: '#203', table_ref: 'T3', items: 'حمص (2)',             waiter: 'سامي',  status: 'done'     },
])

// restaurant_tables
await ins('restaurant_tables', [
  { n:  1, status: 'g' }, { n:  2, status: 'g' }, { n:  3, status: 'e' },
  { n:  4, status: 'g' }, { n:  5, status: 'f' }, { n:  6, status: 'g' },
  { n:  7, status: 'e' }, { n:  8, status: 'g' }, { n:  9, status: 'g' },
  { n: 10, status: 'f' }, { n: 11, status: 'f' }, { n: 12, status: 'g' },
  { n: 13, status: 'f' }, { n: 14, status: 'g' }, { n: 15, status: 'e' },
])

// offers
await ins('offers', [
  { title: 'Happy Hour',    description: 'خصم 20% — 6-8 مساءً', active: true  },
  { title: 'وجبة العائلة', description: '4 أشخاص بسعر 3',        active: true  },
  { title: 'عرض الغداء',   description: 'طبق رئيسي + مشروب',    active: false },
  { title: 'الجمعة الخاصة',description: 'خصم 15% للكل',         active: false },
])

// notifications
await ins('notifications', [
  { table_ref: '3',  message: 'طلب الحساب',     time: '2 دق.',  color: '#E24B4A' },
  { table_ref: '7',  message: 'طلب جديد #216', time: '5 دق.',  color: '#DCA95C' },
  { table_ref: '11', message: 'نداء: ماء',      time: '8 دق.',  color: '#E8A020' },
  { table_ref: '9',  message: 'تقييم ★★★★★',   time: '12 دق.', color: '#4CAF50' },
])

console.log('\n✅ Seed complete!')
