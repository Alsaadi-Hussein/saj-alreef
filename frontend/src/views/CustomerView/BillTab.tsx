import { useEffect, useState, useMemo } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import type { MenuItem } from '../../types'

// ─── Types ────────────────────────────────────────────────────
interface OrderRow { id: string; items: string; total: number; time: string }
interface ParsedLine {
  name: string; qty: number; unitPrice: number; subtotal: number
  emoji: string; catLabel: string
}

// ─── Helpers ──────────────────────────────────────────────────
const CAT_MAP: Record<string, string> = { m: 'رئيسية', s: 'مقبلات', d: 'مشروبات', sw: 'حلويات' }

function getFloor(t: string) {
  const n = parseInt(t.replace('T', ''))
  return n <= 40 ? 1 : n <= 70 ? 2 : 3
}

function parseItemsText(text: string): { name: string; qty: number }[] {
  return text.split(/،|,/).map(s => s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.+?)\s*\((\d+)\)$/)
    return m ? { name: m[1].trim(), qty: parseInt(m[2]) } : { name: part, qty: 1 }
  })
}

function enrichLines(orders: OrderRow[], menu: MenuItem[]): ParsedLine[] {
  const acc: Record<string, ParsedLine> = {}
  for (const order of orders) {
    for (const p of parseItemsText(order.items)) {
      const mi = menu.find(m => m.name === p.name)
        ?? menu.find(m => p.name.includes(m.name.split(' ')[0]) || m.name.includes(p.name.split(' ')[0]))
      const up = mi?.price ?? 0
      if (acc[p.name]) {
        acc[p.name].qty    += p.qty
        acc[p.name].subtotal += up * p.qty
      } else {
        acc[p.name] = {
          name: p.name, qty: p.qty,
          unitPrice: up, subtotal: up * p.qty,
          emoji: mi?.emoji ?? '🍽️',
          catLabel: CAT_MAP[mi?.category ?? ''] ?? '',
        }
      }
    }
  }
  return Object.values(acc)
}

// ─── CSS keyframes (injected once) ───────────────────────────
const CSS = `
@keyframes fadeSlide {
  from { opacity: 0; transform: translateX(20px) }
  to   { opacity: 1; transform: translateX(0) }
}
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-10px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes lineW {
  from { width: 0; opacity: 0 }
  to   { width: 100%; opacity: 1 }
}
@keyframes shimmer {
  0%   { background-position: 200% center }
  100% { background-position: -200% center }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.75) }
  to   { opacity: 1; transform: scale(1) }
}
@keyframes badgePop {
  from { opacity: 0; transform: scale(0.5) }
  to   { opacity: 1; transform: scale(1) }
}
@keyframes billSpin {
  to { transform: rotate(360deg) }
}
`

// Shorthand helper: name duration timing delay fill-mode
const a = (name: string, dur: string, ease: string, delay: string) =>
  `${name} ${dur} ${ease} ${delay} forwards`

// ─── Component ────────────────────────────────────────────────
export default function BillTab({ table = 'T5' }: { table?: string }) {
  const [billSent,      setBillSent]      = useState(false)
  const [noteSent,      setNoteSent]      = useState(false)
  const [note,          setNote]          = useState('')
  const [loading,       setLoading]       = useState(false)
  const [noteLoading,   setNoteLoading]   = useState(false)
  const [orders,        setOrders]        = useState<OrderRow[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [menu,          setMenu]          = useState<MenuItem[]>([])
  const [animKey,       setAnimKey]       = useState(0)

  useEffect(() => { api.getMenu().then(setMenu) }, [])

  useEffect(() => {
    async function fetchOrders() {
      setLoadingOrders(true)
      const { data } = await supabase
        .from('orders')
        .select('id, items, total, time')
        .eq('table_ref', table)
        .neq('status', 'served')
        .order('created_at', { ascending: true })
      setOrders((data ?? []) as OrderRow[])
      setAnimKey(k => k + 1)
      setLoadingOrders(false)
    }
    fetchOrders()
    const ch = supabase.channel(`bill-tab-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [table])

  const lines = useMemo(() => enrichLines(orders, menu), [orders, menu])

  // Financials
  const matchedSub = lines.reduce((s, l) => s + l.subtotal, 0)
  const subTotal   = matchedSub > 0
    ? matchedSub
    : orders.reduce((s, o) => s + (o.total ?? 0), 0)

  // Header data
  const tableNum   = parseInt(table.replace('T', '')) || 1
  const floor      = getFloor(table)
  const latestTime = orders[orders.length - 1]?.time ?? new Date().toTimeString().slice(0, 5)

  // Dynamic delays — extra rows push subtotals + total later
  const extraRows  = Math.max(0, lines.length - 3)
  const td         = (base: number) => `${(base + extraRows * 0.2).toFixed(2)}s`

  async function requestBill() {
    if (loading || billSent) return
    setLoading(true)
    await api.requestBill(table)
    try { await api.sendAlert(table, 'طلب الحساب', '💳') } catch (_) {}
    setLoading(false)
    setBillSent(true)
  }

  async function sendNote() {
    if (noteLoading || !note.trim()) return
    setNoteLoading(true)
    await api.sendNote(table, note)
    setNoteLoading(false)
    setNoteSent(true)
  }

  // ── Shared card shell style ──────────────────────────────────
  const cardShell: React.CSSProperties = {
    background:   '#0A0A0A',
    borderRadius: 20,
    border:       '1px solid #1E1E1E',
    marginBottom: 12,
    overflow:     'hidden',
  }

  return (
    <div style={{ padding: 14 }} dir="rtl">
      <style>{CSS}</style>

      {/* ── Loading ───────────────────────────────────────── */}
      {loadingOrders && (
        <div style={cardShell}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 0', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              border: '2px solid rgba(220,169,92,0.2)',
              borderTopColor: '#DCA95C',
              animation: 'billSpin 0.9s linear infinite',
            }} />
            <span style={{ color: '#2a2a2a', fontSize: 11 }}>جارٍ التحميل...</span>
          </div>
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────── */}
      {!loadingOrders && orders.length === 0 && (
        <div style={cardShell}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.1 }}>🧾</span>
            <span style={{ color: '#2a2a2a', fontSize: 12 }}>لا توجد طلبات نشطة</span>
          </div>
        </div>
      )}

      {/* ── Animated Bill Card ────────────────────────────── */}
      {!loadingOrders && orders.length > 0 && (
        <div key={animKey} style={cardShell}>
          <div style={{ padding: 16 }}>

            {/* 1 ── Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: 14,
              animation: a('fadeDown', '0.5s', 'ease', '0s'), opacity: 0,
            }}>
              {/* Right: title + badge */}
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
                  تفاصيل الطلب
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DCA95C', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{
                    fontSize: 10, color: '#666',
                    animation: a('badgePop', '0.4s', 'cubic-bezier(0.34,1.56,0.64,1)', '0.5s'),
                    opacity: 0,
                  }}>
                    {lines.length} أصناف
                  </span>
                </div>
              </div>

              {/* Left: TABLE card */}
              <div dir="ltr" style={{
                background: '#111', border: '1px solid #1E1E1E',
                borderRadius: 10, padding: '7px 10px',
                textAlign: 'left', minWidth: 68,
              }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.18em', fontFamily: 'monospace' }}>TABLE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#DCA95C', lineHeight: 1.15, marginTop: 1 }}>
                  T{tableNum}
                </div>
                <div style={{ fontSize: 9, color: '#333', marginTop: 1 }}>
                  طابق {floor} · {latestTime}
                </div>
              </div>
            </div>

            {/* 2 ── Gold accent line */}
            <div style={{
              height: 1.5,
              background: 'linear-gradient(90deg, transparent, #DCA95C, transparent)',
              marginBottom: 14,
              animation: a('lineW', '0.6s', 'ease', '0.4s'),
              width: 0, opacity: 0,
            }} />

            {/* 3 ── Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 58px 34px 68px',
              columnGap: 4,
              marginBottom: 4,
              animation: a('fadeDown', '0.5s', 'ease', '0.6s'), opacity: 0,
            }}>
              <div style={{ fontSize: 10, color: '#333', textAlign: 'right' }}>الصنف</div>
              <div style={{ fontSize: 10, color: '#333', textAlign: 'center' }}>الوحدة</div>
              <div style={{ fontSize: 10, color: '#333', textAlign: 'center' }}>كمية</div>
              <div style={{ fontSize: 10, color: '#333', textAlign: 'left' }}>المجموع</div>
            </div>

            {/* 4 ── Item rows */}
            {lines.length > 0 ? (
              lines.map((line, i) => (
                <div key={line.name}>
                  {/* Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 58px 34px 68px',
                    columnGap: 4,
                    alignItems: 'center',
                    paddingTop: 9, paddingBottom: 9,
                    animation: a('fadeSlide', '0.5s', 'ease', `${(0.7 + i * 0.2).toFixed(2)}s`),
                    opacity: 0,
                  }}>
                    {/* Name + emoji + category */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {line.name}
                        </span>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{line.emoji}</span>
                      </div>
                      {line.catLabel && (
                        <div style={{ fontSize: 10, color: '#2e2e2e', marginTop: 1 }}>{line.catLabel}</div>
                      )}
                    </div>

                    {/* Unit price */}
                    <div style={{ fontSize: 11, color: '#3a3a3a', textAlign: 'center' }}>
                      {line.unitPrice > 0 ? line.unitPrice.toLocaleString() : '—'}
                    </div>

                    {/* Quantity badge */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: '#141414', border: '1px solid rgba(220,169,92,0.267)',
                        color: '#DCA95C', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {line.qty}
                      </span>
                    </div>

                    {/* Subtotal — gradient or dim */}
                    {line.subtotal > 0 ? (
                      <div style={{
                        fontSize: 13, fontWeight: 600, textAlign: 'left',
                        background: 'linear-gradient(90deg, #c8922a, #f0c96a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        {line.subtotal.toLocaleString()}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'left', color: '#3a3a3a' }}>—</div>
                    )}
                  </div>

                  {/* Divider between rows (not after last) */}
                  {i < lines.length - 1 && (
                    <div style={{
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, #1E1E1E, transparent)',
                      animation: a('fadeUp', '0.5s', 'ease', `${(0.85 + i * 0.2).toFixed(2)}s`),
                      opacity: 0,
                    }} />
                  )}
                </div>
              ))
            ) : (
              /* Fallback: items text not parseable — show raw order list */
              orders.map((o, i) => (
                <div key={o.id} style={{
                  paddingTop: 9, paddingBottom: 9,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  animation: a('fadeSlide', '0.5s', 'ease', `${(0.7 + i * 0.2).toFixed(2)}s`),
                  opacity: 0,
                }}>
                  <div style={{ fontSize: 11, color: o.total > 0 ? '#DCA95C' : '#3a3a3a' }}>
                    {o.total > 0 ? o.total.toLocaleString() : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#e8e8e8', textAlign: 'right', flex: 1, marginRight: 8 }}>{o.items}</div>
                </div>
              ))
            )}

            {/* 5 ── Divider before total */}
            <div style={{ borderTop: '1px dashed #1a1a1a', marginTop: 10 }} />

            {/* 6 ── Total card */}
            <div style={{
              background: '#111', border: '1px solid rgba(220,169,92,0.133)',
              borderRadius: 14, padding: 16, marginTop: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              animation: a('countUp', '0.6s', 'cubic-bezier(0.34,1.56,0.64,1)', td(1.4)),
              opacity: 0,
            }}>
              {/* Right: labels */}
              <div>
                <div style={{ fontSize: 11, color: '#3a3a3a' }}>المجموع الكلي</div>
              </div>
              {/* Left: shimmer number */}
              <div dir="ltr" style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: 30, fontWeight: 700, lineHeight: 1,
                  background: 'linear-gradient(90deg, #c8922a, #f5d080, #DCA95C, #f5d080, #c8922a)',
                  backgroundSize: '300% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 8s linear infinite',
                }}>
                  {subTotal > 0 ? subTotal.toLocaleString() : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#3a3a3a', marginTop: 3 }}>دينار عراقي</div>
              </div>
            </div>
          </div>

          {/* 7 ── Bottom accent line (full-bleed, outside padding) */}
          <div style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(220,169,92,0.4), #DCA95C, rgba(220,169,92,0.4), transparent)',
          }} />
        </div>
      )}

      {/* ── Request Bill Button ───────────────────────────── */}
      <button
        onClick={requestBill}
        disabled={loading || billSent}
        className="w-full mb-3 py-2.5 rounded-[9px] text-[12px] font-medium bg-gold text-black
          hover:bg-gold-light active:scale-95 transition-all duration-200 disabled:opacity-70"
      >
        {loading ? 'جارٍ...' : billSent ? '✓ تم الإرسال' : 'اطلب الحساب الآن'}
      </button>

      {billSent && (
        <div className="text-[12px] text-gold mb-3 text-center animate-fade-in">✓ تم إبلاغ النادل!</div>
      )}

      {/* ── Note Section ─────────────────────────────────── */}
      <div className="h-px bg-c3 my-4" />

      <div className="text-[11px] text-white/60 text-right mb-2">لديك ملاحظة؟</div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full h-20 bg-c2 border border-c3 rounded-[10px] p-2.5 text-white text-[12px] resize-none outline-none
          focus:border-gold transition-colors duration-200 text-right font-sans"
        placeholder="اكتب ملاحظتك هنا..."
        dir="rtl"
      />
      <button
        onClick={sendNote}
        disabled={noteLoading || noteSent || !note.trim()}
        className="w-full mt-2 py-2.5 rounded-[9px] text-[12px] text-gold border border-gold-dark bg-transparent
          hover:bg-gold/10 active:scale-95 transition-all duration-200 disabled:opacity-50"
      >
        {noteSent ? '✓ تم الإرسال' : 'إرسال الملاحظة'}
      </button>
      {noteSent && (
        <div className="text-[12px] text-gold mt-2 text-center animate-fade-in">✓ تم إرسال ملاحظتك!</div>
      )}
    </div>
  )
}
