import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const SHIFT_KEY        = 'saj_shift'
const SHIFT_ENDED_KEY  = 'saj_shift_ended'

interface ShiftData { startTime: string; shiftNum: number }
interface ShiftOrder { id: string; items: string; time: string }

export default function ShiftView() {
  const [shift,    setShift]    = useState<ShiftData | null>(null)
  const [orders,   setOrders]   = useState<ShiftOrder[]>([])
  const [expenses, setExpenses] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [ended,    setEnded]    = useState(false)
  const AVG_ORDER = 15000

  useEffect(() => {
    // Never auto-resume a shift that was already ended
    if (localStorage.getItem(SHIFT_ENDED_KEY) === 'true') return
    const raw = localStorage.getItem(SHIFT_KEY)
    if (raw) {
      try { setShift(JSON.parse(raw)) } catch { localStorage.removeItem(SHIFT_KEY) }
    }
  }, [])

  async function startShift() {
    const data: ShiftData = { startTime: new Date().toISOString(), shiftNum: (shift?.shiftNum ?? 0) + 1 }
    localStorage.setItem(SHIFT_KEY, JSON.stringify(data))
    localStorage.removeItem(SHIFT_ENDED_KEY)
    setShift(data)
    setEnded(false)
    setOrders([])
    setExpenses('')
  }

  async function loadAndEnd() {
    if (!shift) return
    setLoading(true)
    const raw = await api.getOrdersSince(shift.startTime)
    setOrders(raw)
    setLoading(false)
    // Persist the ended state so it survives navigation
    localStorage.setItem(SHIFT_ENDED_KEY, 'true')
    setEnded(true)
  }

  async function confirmEnd() {
    localStorage.removeItem(SHIFT_KEY)
    localStorage.removeItem(SHIFT_ENDED_KEY)
    setShift(null)
    setEnded(false)
    setOrders([])
    setExpenses('')
  }

  const revenue      = orders.length * AVG_ORDER
  const expensesNum  = parseFloat(expenses) || 0
  const netProfit    = revenue - expensesNum
  const duration     = shift ? formatDuration(new Date(shift.startTime)) : '—'

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <h1 className="text-[20px] font-semibold text-white text-right mb-5">إدارة الوردية</h1>

      {!shift ? (
        /* No active shift */
        <div className="text-center py-16">
          <div className="text-[48px] mb-4">🕐</div>
          <div className="text-[16px] font-medium text-white/60 mb-2">لا توجد وردية نشطة</div>
          <div className="text-[13px] text-white/35 mb-8">اضغط على الزر لبدء وردية جديدة</div>
          <button
            onClick={startShift}
            className="py-3 px-8 rounded-[11px] text-[14px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            style={{ background: '#DCA95C' }}
          >
            ▸ بدء وردية جديدة
          </button>
        </div>
      ) : !ended ? (
        /* Active shift */
        <>
          <div className="rounded-xl p-5 border border-gold/25 mb-5" style={{ background: 'linear-gradient(145deg,#1A1200,#0D0D0D)' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="badge badge-ok text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse inline-block" />
                نشطة
              </span>
              <span className="text-[14px] font-medium text-gold">الوردية {shift.shiftNum}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="rounded-xl p-3 border border-gold/15" style={{ background: 'rgba(220,169,92,0.05)' }}>
                <div className="text-[10px] text-white/40 mb-1">وقت البدء</div>
                <div className="text-[14px] font-semibold text-gold">
                  {new Date(shift.startTime).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="rounded-xl p-3 border border-gold/15" style={{ background: 'rgba(220,169,92,0.05)' }}>
                <div className="text-[10px] text-white/40 mb-1">المدة</div>
                <div className="text-[14px] font-semibold text-gold">{duration}</div>
              </div>
            </div>
          </div>

          <button
            onClick={loadAndEnd} disabled={loading}
            className="w-full py-3 rounded-[11px] text-[14px] font-semibold bg-err text-white hover:bg-err/80 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'جارٍ التحميل...' : '✓ إنهاء الوردية'}
          </button>
        </>
      ) : (
        /* Shift ended — show summary */
        <>
          <div className="rounded-xl p-5 border border-gold/25 mb-4" style={{ background: 'linear-gradient(145deg,#1A1200,#0D0D0D)' }}>
            <div className="text-[13px] text-gold font-medium text-right mb-4">ملخص الوردية {shift.shiftNum}</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'عدد الطلبات',  value: orders.length },
                { label: 'مدة الوردية',  value: duration },
                { label: 'الإيراد المقدر', value: `${revenue.toLocaleString()} د.ع` },
                { label: 'متوسط الطلب',  value: orders.length > 0 ? `${AVG_ORDER.toLocaleString()} د.ع` : '—' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 border border-gold/15 text-right" style={{ background: 'rgba(220,169,92,0.05)' }}>
                  <div className="text-[10px] text-white/40 mb-1">{s.label}</div>
                  <div className="text-[15px] font-semibold text-gold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Expenses input */}
            <div className="mb-4">
              <label className="text-[11px] text-white/50 block mb-1.5 text-right">المصاريف والنفقات (د.ع)</label>
              <input
                type="number" value={expenses} onChange={e => setExpenses(e.target.value)}
                placeholder="0" min={0}
                className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-gold/50 text-right"
              />
            </div>

            {/* Net profit */}
            <div className="rounded-xl p-3 border border-ok/25 text-right" style={{ background: 'rgba(76,175,80,0.06)' }}>
              <div className="text-[11px] text-ok/70 mb-1">صافي الربح (بعد المصاريف)</div>
              <div className={`text-[20px] font-bold ${netProfit >= 0 ? 'text-ok' : 'text-err'}`}>
                {netProfit.toLocaleString()} د.ع
              </div>
            </div>
          </div>

          {/* Orders list */}
          {orders.length > 0 && (
            <div className="rounded-xl border border-c3 overflow-hidden mb-4" style={{ background: '#111111' }}>
              <div className="px-4 py-3 border-b border-c3 text-right text-[13px] font-medium text-white">
                طلبات الوردية ({orders.length})
              </div>
              <div className="max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
                {orders.map((o, i) => (
                  <div key={o.id} className={`flex items-center justify-between px-4 py-2.5 ${i < orders.length - 1 ? 'border-b border-c3/40' : ''}`}>
                    <span className="text-[11px] text-white/40">{o.time}</span>
                    <div className="text-right flex-1 mx-3">
                      <span className="text-[11px] text-white/70 truncate block">{o.items}</span>
                    </div>
                    <span className="text-[11px] text-gold font-medium">{o.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={confirmEnd}
            className="w-full py-3 rounded-[11px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
            style={{ background: '#DCA95C' }}
          >
            ▸ بدء وردية جديدة
          </button>
        </>
      )}
    </div>
  )
}

function formatDuration(start: Date): string {
  const ms = Date.now() - start.getTime()
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} س ${m} د` : `${m} دقيقة`
}
