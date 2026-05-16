import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { KitchenOrder, StockItem, Alert } from '../../types/index'


// ─── KDS Screen ───────────────────────────────────────────────
function KdsScreen() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])

  useEffect(() => {
    api.getOrders().then(setOrders)

    const ch = supabase.channel('kitchen-kds')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p: { new: Record<string, string> }) => {
        const r = p.new
        setOrders(prev => [{ id: r.id, table: r.table_ref, items: r.items, time: r.time, status: r.status as 'new' | 'ready', createdAt: r.created_at }, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p: { new: Record<string, string> }) => {
        const r = p.new
        setOrders(prev => prev.map(o => o.id === r.id ? { ...o, status: r.status as 'new' | 'ready' } : o))
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  async function markReady(id: string) {
    await api.markOrderReady(id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'ready' as const } : o))
  }

  function printOrder(o: KitchenOrder) {
    const w = window.open('', '_blank', 'width=320,height=480')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${o.id}</title>
    <style>body{font-family:monospace;font-size:14px;text-align:right;padding:20px;direction:rtl}
    h2{font-size:18px;margin:0 0 12px}hr{border:none;border-top:1px dashed #000;margin:10px 0}
    .row{display:flex;justify-content:space-between}.items{margin:10px 0;line-height:1.8}
    .footer{font-size:11px;color:#555;margin-top:16px;text-align:center}</style></head>
    <body><h2>صاج الريف</h2><hr>
    <div class="row"><span>${o.time}</span><span><b>طاولة ${o.table}</b></span></div>
    <div class="row"><span></span><span>رقم الطلب: <b>${o.id}</b></span></div><hr>
    <div class="items">${o.items.split('،').map(i => `<div>${i.trim()}</div>`).join('')}</div><hr>
    <div class="footer">شكراً لزيارتكم — صاج الريف</div>
    <script>setTimeout(()=>{window.print();window.close()},200)</script></body></html>`)
    w.document.close()
  }

  const activeOrders = orders.filter(o => o.status === 'new')
  const urgentCount  = activeOrders.filter(o => api.getOrderMinutesAgo(o) > 15).length

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="badge badge-err text-[11px] flex items-center gap-1">
              <span className="text-sm">▲</span> {urgentCount} عاجل
            </span>
          )}
          <span className="badge badge-ok text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse inline-block" />
            مباشر
          </span>
        </div>
        <div className="text-right">
          <h1 className="text-[20px] font-semibold text-white">شاشة المطبخ KDS</h1>
          <p className="text-[11px] text-white/45 mt-0.5">الطلبات النشطة - مرتبة زمنياً</p>
        </div>
      </div>

      {/* Order Cards */}
      {activeOrders.length === 0 ? (
        <div className="text-center py-20 text-white/25 text-[14px]">لا توجد طلبات نشطة ✓</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {activeOrders.map((o, i) => {
            const mins = api.getOrderMinutesAgo(o)
            const urgent = mins > 15
            return (
              <div
                key={o.id}
                className="rounded-[13px] p-4 border animate-slide-up"
                style={{
                  background: '#111111',
                  borderColor: urgent ? '#E24B4A' : 'rgba(220,169,92,0.35)',
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium text-black" style={{ background: '#DCA95C' }}>
                    {o.table}
                  </span>
                  <span className="text-[17px] font-bold text-gold">{o.id}</span>
                </div>

                {/* Items */}
                <div className="text-[13px] font-medium text-white text-right mb-2 leading-snug">
                  {o.items}
                </div>

                {/* Time */}
                <div className="flex justify-end items-center gap-1 mb-3">
                  <span className={`text-[11px] ${urgent ? 'text-err' : 'text-white/40'}`}>
                    {mins > 0 ? `${mins} د مضت` : o.time}
                  </span>
                  <span className="text-[11px] text-white/30">⏱</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => printOrder(o)}
                    className="flex-shrink-0 px-3 py-2 rounded-[9px] text-[12px] font-medium bg-c2 border border-c3 text-white/60 hover:bg-c3 cursor-pointer transition-all"
                  >
                    🖨
                  </button>
                  <button
                    onClick={() => markReady(o.id)}
                    className="flex-1 py-2 rounded-[9px] text-[12px] font-medium text-black hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer"
                    style={{ background: '#DCA95C' }}
                  >
                    ✓ Ready / تم
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed orders */}
      {orders.filter(o => o.status === 'ready').length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] text-white/30 text-right mb-3">الطلبات المكتملة</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {orders.filter(o => o.status === 'ready').slice(0, 6).map((o, i) => (
              <div key={o.id} className="rounded-[11px] p-3 border border-ok/20 opacity-50" style={{ background: '#111111' }}>
                <div className="flex justify-between items-center">
                  <span className="badge badge-ok text-[10px]">✓ تم</span>
                  <span className="text-[13px] text-gold font-medium">{o.id}</span>
                </div>
                <div className="text-[11px] text-white/50 text-right mt-1.5 truncate">{o.items}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inventory Screen ─────────────────────────────────────────
function InventoryScreen() {
  const [stock, setStock] = useState<StockItem[]>([])
  useEffect(() => {
    api.getStock().then(setStock)
    const ch = supabase.channel('kitchen-inventory-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => {
        api.getStock().then(setStock)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <h1 className="text-[20px] font-semibold text-white text-right mb-5">إدارة المخزون</h1>
      <div className="grid gap-3">
        {stock.map((s, i) => {
          const pct = Math.min((s.current / (s.minimum * 2)) * 100, 100)
          const low = s.current < s.minimum
          return (
            <div key={i} className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {low && <span className="badge badge-warn text-[10px]">منخفض</span>}
                  <span className="text-[12px] text-white/50">{s.current} / {s.minimum * 2} {s.unit}</span>
                </div>
                <span className="text-[13px] font-medium text-white">{s.name}</span>
              </div>
              <div className="h-[6px] rounded-full bg-c3">
                <div
                  className="h-[6px] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: low ? '#E24B4A' : '#DCA95C' }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-white/30">الحد الأدنى: {s.minimum} {s.unit}</span>
                <span className="text-[10px] text-white/30">المتوفر: {s.current} {s.unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Alerts Screen ────────────────────────────────────────────
function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    api.getAlerts().then(setAlerts)

    const ch = supabase.channel('kitchen-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (p: any) => {
        const r = p.new
        setAlerts(prev => [{ id: r.id, table: r.table_ref, type: r.type, emoji: r.emoji, time: r.time }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function dismiss(id: number) {
    await api.dismissAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <div className="flex justify-between items-center mb-5">
        <span className="text-[12px] text-white/40">{alerts.length} تنبيه</span>
        <h1 className="text-[20px] font-semibold text-white">التنبيهات</h1>
      </div>
      {alerts.length === 0 && (
        <div className="text-center py-20 text-white/25 text-[14px]">لا توجد تنبيهات ✓</div>
      )}
      <div className="grid gap-3">
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between rounded-xl px-4 py-3.5 border border-gold/25" style={{ background: '#111111' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dismiss(a.id)}
                className="text-[11px] text-white/40 hover:text-err border border-c3 rounded-[7px] px-2.5 py-1 cursor-pointer hover:border-err/40 transition-colors"
              >
                تجاهل
              </button>
              <span className="text-[11px] text-white/35">{a.time}</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[13px] text-white">{a.type}</span>
                <span className="text-[11px] text-white/40 mr-2">طاولة {a.table}</span>
              </div>
              <span className="text-[20px]">{a.emoji}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────
export default function KitchenView() {
  const { kitchenSub, setKitchenSub } = useStore()
  const [alertCount,    setAlertCount]    = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    api.getAlerts().then(a => setAlertCount(a.length))
    api.getStock().then(s => setLowStockCount(s.filter(i => i.current < i.minimum).length))

    const ch = supabase.channel('kitchen-view-meta')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setAlertCount(c => c + 1)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alerts' }, () => {
        api.getAlerts().then(a => setAlertCount(a.length))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => {
        api.getStock().then(s => setLowStockCount(s.filter(i => i.current < i.minimum).length))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const sidebarItems = [
    { id: 'kds',       label: 'شاشة المطبخ KDS', badge: 0 },
    { id: 'inventory', label: 'إدارة المخزون',   badge: lowStockCount },
    { id: 'alerts',    label: 'التنبيهات',        badge: alertCount },
  ]

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {kitchenSub === 'kds'       && <KdsScreen />}
        {kitchenSub === 'inventory' && <InventoryScreen />}
        {kitchenSub === 'alerts'    && <AlertsScreen />}
      </div>

      {/* Right Sidebar */}
      <div className="w-[200px] border-r border-c3 flex flex-col py-4 flex-shrink-0" style={{ background: '#0D0D0D' }}>
        <div className="text-[10px] text-white/30 px-4 mb-3 tracking-widest text-right">المطبخ</div>
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => setKitchenSub(item.id as any)}
            className={`w-full text-right px-4 py-2.5 text-[13px] flex items-center justify-between transition-all duration-150 cursor-pointer border-none
              ${kitchenSub === item.id
                ? 'bg-gold/10 text-gold font-medium'
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
            style={{
              background: kitchenSub === item.id ? 'rgba(220,169,92,0.1)' : 'transparent',
              borderRight: kitchenSub === item.id ? '2px solid #DCA95C' : '2px solid transparent',
            }}
          >
            <span className="flex items-center gap-1.5">
              {item.badge > 0 && (
                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-err text-white flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="text-right">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
