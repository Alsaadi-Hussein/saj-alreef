import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { menuData, BASE_IMG } from '../../data/menuData'
import type { MenuItem, Table, KitchenOrder } from '../../types/index'

// ─── POS item shape (superset of MenuItem, cast when passed to store) ─────────
interface PosMenuItem {
  id: number
  name: string
  nameEn: string
  desc: string
  price: number
  category: string
  categoryLabel: string
  emoji: string
  img: string | null
  imgSrc?: string | null   // full image src (data URL for admin-added items)
}

// Fallback category for DB items whose section isn't a known menu section.
const ADDED_CAT = 'added'
const ADDED_LABEL = 'وجبات مضافة'
const KNOWN_CATS = new Set(menuData.map(c => c.id))
const sectionLabel = (id: string) => menuData.find(c => c.id === id)?.label ?? ADDED_LABEL

// DB ids are offset so they never collide with static item ids in the cart.
// The item lands in the exact section the admin picked (m.category).
function dbToPosItem(m: MenuItem): PosMenuItem {
  const cid = KNOWN_CATS.has(m.category) ? m.category : ADDED_CAT
  return {
    id: 1_000_000 + m.id,
    name: m.name,
    nameEn: m.desc ?? '',
    desc: m.desc ?? '',
    price: m.price,
    category: cid,
    categoryLabel: sectionLabel(cid),
    emoji: m.emoji || '🍽️',
    img: null,
    imgSrc: m.image ?? null,
  }
}

function parsePrice(p: string): number {
  return parseInt(p.replace(/,/g, '').match(/\d+/)?.[0] ?? '0')
}

// Build flat list from all menuData categories with sequential numeric IDs
let _seq = 1
const allPosItems: PosMenuItem[] = menuData.flatMap(cat =>
  cat.items.map(item => ({
    id: _seq++,
    name: item.a,
    nameEn: item.e,
    desc: item.e,
    price: parsePrice(item.p),
    category: cat.id,
    categoryLabel: cat.label,
    emoji: '',
    img: item.img ?? null,
  }))
)

const CATS = [
  { id: 'all', label: 'الكل' },
  ...menuData.map(c => ({ id: c.id, label: c.label })),
]

const FLOORS = [
  { n: 1, label: 'طابق 1', color: '#DCA95C' },
  { n: 2, label: 'طابق 2', color: '#378ADD' },
  { n: 3, label: 'طابق 3', color: '#E87EA1' },
]

type PayMethod = 'cash' | 'card'

const ST_COLOR: Record<string, string> = { g: '#4CAF50', e: '#DCA95C', f: '#E24B4A' }
const ST_LABEL: Record<string, string> = { g: 'فارغة', e: 'يأكلون', f: 'ينهون' }

export default function PosView() {
  const { posCategory, setPosCategory, posCart, setPosCartQty, clearPosCart } = useStore()
  const [paid,          setPaid]          = useState(false)
  const [printing,      setPrinting]      = useState(false)
  const [discount,      setDiscount]      = useState('')
  const [discType,      setDiscType]      = useState<'pct' | 'fixed'>('pct')
  const [payMethod,     setPayMethod]     = useState<PayMethod>('cash')
  const [tables,        setTables]        = useState<Table[]>([])
  const [activeFloor,   setActiveFloor]   = useState(1)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [tableOrders,   setTableOrders]   = useState<KitchenOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [paying,        setPaying]        = useState(false)
  const [ordersTick,    setOrdersTick]    = useState(0)
  const [dbItems,       setDbItems]       = useState<PosMenuItem[]>([])

  // Main data + realtime
  useEffect(() => {
    api.getTables().then(setTables)
    api.getMenu().then(ms => setDbItems(ms.map(dbToPosItem)))

    const ch = supabase.channel('pos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        api.getTables().then(ts => {
          setTables(ts)
          setSelectedTable(prev => prev ? (ts.find(t => t.n === prev.n) ?? null) : null)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setOrdersTick(t => t + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        api.getMenu().then(ms => setDbItems(ms.map(dbToPosItem)))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Reload orders when selected table or tick changes
  useEffect(() => {
    if (!selectedTable) { setTableOrders([]); return }
    setLoadingOrders(true)
    api.getOrders().then(orders => {
      setTableOrders(orders.filter(o => o.table === `T${selectedTable.n}` && (o.status === 'new' || o.status === 'ready')))
      setLoadingOrders(false)
    })
  }, [selectedTable?.n, ordersTick])

  // Admin-added items appear inside their own section; only show the fallback
  // "وجبات مضافة" chip if some items have an unknown section.
  const hasExtras = dbItems.some(i => i.category === ADDED_CAT)
  const catChips = [
    ...CATS,
    ...(hasExtras ? [{ id: ADDED_CAT, label: ADDED_LABEL }] : []),
  ]
  const visible =
    posCategory === 'all'       ? [...dbItems, ...allPosItems]
    : posCategory === ADDED_CAT ? dbItems.filter(i => i.category === ADDED_CAT)
    : [...dbItems.filter(i => i.category === posCategory), ...allPosItems.filter(i => i.category === posCategory)]
  const floorTables = tables.filter(t => t.floor === activeFloor)
  const cartItems   = Object.values(posCart)
  const subtotal    = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0)
  const discNum     = parseFloat(discount) || 0
  const discAmt     = discType === 'pct' ? Math.round(subtotal * discNum / 100) : Math.min(discNum, subtotal)
  const total       = subtotal - discAmt
  const tableTotal  = tableOrders.reduce((s, o) => s + (o.total ?? 0), 0)

  async function checkout() {
    if (cartItems.length === 0) return
    const tableRef = selectedTable ? `T${selectedTable.n}` : 'T1'
    const itemStr  = cartItems.map(c => `${c.item.name}(${c.qty})`).join('، ')
    await api.placePosOrder(itemStr, tableRef, total)
    setPaid(true)
    clearPosCart()
    setDiscount('')
    setTimeout(() => setPaid(false), 3000)
  }

  async function payTable() {
    if (!selectedTable) return
    setPaying(true)
    try {
      if (selectedTable.currentSessionId) {
        await api.closeSession(selectedTable.currentSessionId, tableTotal)
      } else {
        await api.updateTableStatus(selectedTable.n, 'g')
      }
      const ts = await api.getTables()
      setTables(ts)
      setSelectedTable(null)
      setTableOrders([])
    } catch (err) {
      console.error('payTable error:', err)
      alert('حدث خطأ أثناء إغلاق الجلسة، يرجى المحاولة مجدداً')
    }
    setPaying(false)
  }

  async function print() {
    setPrinting(true)
    await new Promise(r => setTimeout(r, 1200))
    setPrinting(false)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Order panel */}
      <div className="flex flex-col border-l border-c3 flex-shrink-0" style={{ width: 320, background: '#0D0D0D' }}>
        {/* Order header */}
        <div className="px-4 pt-4 pb-3 border-b border-c3 flex-shrink-0">
          <div className="flex justify-between items-center mb-1">
            <div className="flex gap-2 flex-wrap">
              <span className="badge badge-ok text-[11px]">مفتوح</span>
              {selectedTable && (
                <span className="badge badge-gold text-[11px]">طاولة {selectedTable.n}</span>
              )}
            </div>
            <span className="text-[14px] font-semibold text-gold">POS</span>
          </div>
          <div className="text-[11px] text-white/40 text-right mt-0.5">الطلب الحالي</div>
        </div>

        {/* Cart area */}
        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="text-[32px] opacity-20">🍽️</div>
              <div className="text-[12px] text-white/25">انقر على الوجبة لإضافتها</div>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map(c => (
                <div key={c.item.id} className="flex items-center justify-between rounded-[10px] px-3 py-2.5 border border-c3" style={{ background: '#151515' }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPosCartQty(c.item, -1)} className="w-6 h-6 rounded-full bg-c3 text-white text-sm flex items-center justify-center cursor-pointer hover:bg-c4 border-none">−</button>
                    <span className="text-[12px] font-medium text-gold min-w-[18px] text-center">{c.qty}</span>
                    <button onClick={() => setPosCartQty(c.item, 1)} className="w-6 h-6 rounded-full bg-gold text-black text-sm flex items-center justify-center cursor-pointer hover:bg-gold-light border-none">+</button>
                  </div>
                  <div className="text-right flex-1 mr-2">
                    <div className="text-[12px] font-medium text-white">{c.item.name}</div>
                    <div className="text-[11px] text-gold">{(c.item.price * c.qty).toLocaleString()} د.ع</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + actions */}
        <div className="border-t border-c3 p-4 flex-shrink-0">
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setDiscType(t => t === 'pct' ? 'fixed' : 'pct')}
              className="text-[11px] px-2.5 py-1.5 rounded-[7px] border border-c3 text-gold/70 hover:border-gold/40 cursor-pointer transition-all flex-shrink-0"
            >
              {discType === 'pct' ? '%' : 'IQD'}
            </button>
            <input
              type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)}
              placeholder={discType === 'pct' ? 'خصم %' : 'خصم د.ع'}
              className="flex-1 bg-c2 border border-c3 rounded-[7px] px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-gold/50 text-right"
            />
          </div>

          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-[12px]">
              <span className="text-white/50">{subtotal.toLocaleString()} د.ع</span>
              <span className="text-white/50">المجموع الفرعي</span>
            </div>
            {discAmt > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-ok">- {discAmt.toLocaleString()} د.ع</span>
                <span className="text-white/50">الخصم</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-semibold pt-1 border-t border-c3">
              <span className="text-gold">{total.toLocaleString()} د.ع</span>
              <span className="text-white">الإجمالي</span>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            {(['cash', 'card'] as PayMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className="flex-1 py-2 rounded-[9px] text-[12px] font-medium cursor-pointer transition-all border"
                style={{
                  background: payMethod === m ? (m === 'cash' ? 'rgba(76,175,80,0.15)' : 'rgba(56,120,240,0.15)') : 'transparent',
                  borderColor: payMethod === m ? (m === 'cash' ? '#4CAF50' : '#378ADD') : '#242424',
                  color: payMethod === m ? (m === 'cash' ? '#4CAF50' : '#378ADD') : 'rgba(255,255,255,0.5)',
                }}
              >
                {m === 'cash' ? '💵 نقد' : '💳 بطاقة'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => { clearPosCart(); setDiscount('') }}
              className="py-2.5 rounded-[9px] text-[12px] font-medium bg-c2 border border-c3 text-white/70 hover:bg-c3 cursor-pointer transition-all"
            >
              مسح
            </button>
            <button
              onClick={print}
              className="py-2.5 rounded-[9px] text-[12px] font-medium bg-c2 border border-c3 text-white/70 hover:bg-c3 cursor-pointer transition-all"
            >
              {printing ? '...' : '🖨 طباعة'}
            </button>
          </div>

          <button
            onClick={checkout}
            disabled={cartItems.length === 0}
            className="w-full py-3 rounded-[11px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            style={{ background: '#DCA95C' }}
          >
            {paid ? '✓ تم التحصيل!' : `${payMethod === 'cash' ? '💵' : '💳'} تحصيل ${total > 0 ? total.toLocaleString() + ' د.ع' : ''}`}
          </button>
        </div>
      </div>

      {/* Right: Tables bar + Menu grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header with category filter */}
        <div className="px-5 pt-4 pb-3 border-b border-c3 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[12px] text-white/40">صاج الريف - الكاشير</div>
            <h1 className="text-[20px] font-semibold text-white">POS — نقطة البيع</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {catChips.map(c => (
              <button
                key={c.id}
                onClick={() => setPosCategory(c.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer"
                style={{
                  background: posCategory === c.id ? '#DCA95C' : 'transparent',
                  color: posCategory === c.id ? '#000' : 'rgba(255,255,255,0.5)',
                  borderColor: posCategory === c.id ? '#DCA95C' : '#242424',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tables bar with floor filter */}
        <div className="px-4 pt-2.5 pb-2 border-b border-c3 flex-shrink-0" style={{ background: '#0A0A0A' }}>
          {/* Floor buttons */}
          <div className="flex gap-2 mb-2">
            {FLOORS.map(f => (
              <button
                key={f.n}
                onClick={() => setActiveFloor(f.n)}
                className="px-3 py-1 rounded-[7px] text-[11px] font-medium border cursor-pointer transition-all"
                style={{
                  background: activeFloor === f.n ? f.color : '#1a1a1a',
                  borderColor: activeFloor === f.n ? f.color : '#2a2a2a',
                  color: activeFloor === f.n ? '#000' : 'rgba(255,255,255,0.4)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Table chips filtered by floor */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {floorTables.map(t => {
              const isSelected = selectedTable?.n === t.n
              const color = ST_COLOR[t.s] ?? '#DCA95C'
              return (
                <button
                  key={t.n}
                  onClick={() => setSelectedTable(isSelected ? null : t)}
                  className="flex-shrink-0 rounded-[8px] px-2 py-1.5 text-center border transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-95"
                  style={{
                    minWidth: 40,
                    background: isSelected ? `${color}22` : t.s !== 'g' ? `${color}0e` : 'transparent',
                    borderColor: isSelected ? color : t.s !== 'g' ? `${color}55` : '#2A2A2A',
                  }}
                >
                  <div className="text-[10px] font-semibold" style={{ color: t.s !== 'g' ? color : 'rgba(255,255,255,0.22)' }}>T{t.n}</div>
                  <div className="text-[8px] mt-0.5 leading-none" style={{ color: t.s !== 'g' ? `${color}bb` : 'rgba(255,255,255,0.15)' }}>
                    {ST_LABEL[t.s]}
                  </div>
                </button>
              )
            })}
            {floorTables.length === 0 && (
              <div className="text-[11px] text-white/25 py-1.5">لا توجد طاولات في هذا الطابق</div>
            )}
          </div>
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {visible.map(item => {
              const inCart = posCart[item.id]?.qty ?? 0
              return (
                <button
                  key={item.id}
                  onClick={() => setPosCartQty(item as unknown as MenuItem, 1)}
                  className="rounded-xl border text-center cursor-pointer transition-all duration-200 hover:border-gold/50 active:scale-95 overflow-hidden flex flex-col"
                  style={{
                    background: inCart > 0 ? 'rgba(220,169,92,0.08)' : '#111111',
                    borderColor: inCart > 0 ? 'rgba(220,169,92,0.4)' : '#242424',
                  }}
                >
                  {(item.imgSrc ?? (item.img ? BASE_IMG + item.img : null)) ? (
                    <img src={item.imgSrc ?? BASE_IMG + item.img} alt={item.name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="pt-4 pb-1 text-[26px]">{item.emoji || '🍽️'}</div>
                  )}
                  <div className="px-3 pb-3 pt-1 flex flex-col flex-1">
                    <div className="text-[12px] font-medium text-white mb-0.5 leading-tight">{item.name}</div>
                    <div className="text-[10px] text-white/30 mb-1.5 leading-tight truncate">{item.nameEn}</div>
                    <div className="text-[11px] text-gold mt-auto">{item.price.toLocaleString()} <span className="text-[10px] text-white/40">د.ع</span></div>
                    {inCart > 0 && (
                      <div className="mt-1.5 w-5 h-5 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center mx-auto">
                        {inCart}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Table detail panel — slides in from right */}
        {selectedTable && (
          <div
            className="absolute top-0 right-0 h-full flex flex-col z-30 border-l border-c3 animate-slide-left"
            style={{ width: 340, background: '#0D0D0D' }}
          >
            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-c3 flex justify-between items-center flex-shrink-0">
              <button
                onClick={() => setSelectedTable(null)}
                className="text-white/40 hover:text-white text-[20px] cursor-pointer bg-transparent border-none leading-none transition-colors"
              >
                ×
              </button>
              <div className="text-right">
                <div className="text-[16px] font-semibold text-gold">طاولة {selectedTable.n}</div>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-[5px] font-medium"
                    style={{ background: `${ST_COLOR[selectedTable.s]}20`, color: ST_COLOR[selectedTable.s] }}
                  >
                    {ST_LABEL[selectedTable.s]}
                  </span>
                  <span className="text-[11px] text-white/40">طابق {selectedTable.floor}</span>
                </div>
              </div>
            </div>

            {/* Orders list */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
              {selectedTable.s === 'g' ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-[40px] opacity-15">🍽️</div>
                  <div className="text-[13px] text-white/30">طاولة فارغة</div>
                </div>
              ) : loadingOrders ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-[13px] text-white/30">جارٍ التحميل...</div>
                </div>
              ) : tableOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="text-[13px] text-white/30">لا توجد طلبات نشطة</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tableOrders.map(o => (
                    <div key={o.id} className="rounded-[11px] p-3.5 border border-c3" style={{ background: '#111111' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-[5px] font-medium"
                          style={{
                            background: o.status === 'new' ? 'rgba(232,160,32,0.15)' : 'rgba(76,175,80,0.15)',
                            color: o.status === 'new' ? '#E8A020' : '#4CAF50',
                          }}
                        >
                          {o.status === 'new' ? 'قيد التحضير' : '✓ جاهز'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-white/40">{o.time}</span>
                          <span className="text-[13px] font-semibold text-gold">{o.id}</span>
                        </div>
                      </div>
                      <div className="text-[12px] text-white/80 text-right leading-snug">{o.items}</div>
                      {(o.total ?? 0) > 0 && (
                        <div className="text-[11px] text-gold/70 mt-1.5 text-right">{(o.total ?? 0).toLocaleString()} د.ع</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-c3 p-4 flex-shrink-0">
              {tableOrders.length > 0 && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[22px] font-semibold text-gold">
                    {tableTotal.toLocaleString()} <span className="text-[12px] font-normal text-white/50">د.ع</span>
                  </span>
                  <span className="text-[12px] text-white/50">الإجمالي</span>
                </div>
              )}
              <button
                onClick={payTable}
                disabled={paying || selectedTable.s === 'g'}
                className="w-full py-3 rounded-[11px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-35 border-none"
                style={{ background: '#DCA95C' }}
              >
                {paying ? '...' : '✓ تم الدفع / Paid'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
