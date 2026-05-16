import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { Offer, AdminNotification, StockItem } from '../../types/index'
import MenuMgmt         from './MenuMgmt'
import OffersMgmt       from './OffersMgmt'
import SalesView        from './SalesView'
import ShiftView        from './ShiftView'
import RatingsView      from './RatingsView'
import AdminStockView   from './AdminStockView'
import TablesView       from './TablesView'
import ReservationsView from '../ReservationsView'

// ─── Admin Sidebar ────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'dashboard',    label: 'لوحة التحكم',   badge: 0 },
  { id: 'menu',         label: 'إدارة القائمة', badge: 0 },
  { id: 'offers',       label: 'العروض',         badge: 0 },
  { id: 'sales',        label: 'المبيعات',       badge: 0 },
  { id: 'shift',        label: 'إدارة الوردية',  badge: 0 },
  { id: 'reservations', label: 'الحجوزات',       badge: 0 },
  { id: 'ratings',      label: 'التقييمات',      badge: 0 },
  { id: 'stock',        label: 'إدارة المخزون', badge: 0 },
  { id: 'tables',       label: 'الطاولات',       badge: 0 },
]

// ─── Dashboard ────────────────────────────────────────────────
function AdminDashboard() {
  const [stats,      setStats]      = useState({ ordersToday: 220, ordersThisHour: 18, revenue: 501100 })
  const [tableStats, setTableStats] = useState({ occupied: 0, total: 0 })
  const [stock,      setStock]      = useState<StockItem[]>([])
  const [notifs,     setNotifs]     = useState<AdminNotification[]>([])
  const [weekly,     setWeekly]     = useState<{ day: string; val: number }[]>([])
  const [topItems,   setTop]        = useState<{ name: string; count: number; pct: number; color: string }[]>([])
  const [shiftNum,   setShiftNum]   = useState(1)

  useEffect(() => {
    api.getAdminData().then(d => {
      setStats({
        ordersToday: d.stats.ordersToday,
        ordersThisHour: d.stats.ordersThisHour,
        revenue: d.stats.revenue,
      })
      setNotifs(d.notifications)
      setTop(d.topItems)
      setWeekly(d.weeklySales)
    })
    api.getStock().then(setStock)
    api.getTables().then(tables => {
      setTableStats({ occupied: tables.filter(t => t.s !== 'g').length, total: tables.length })
    })

    const ch = supabase.channel('admin-dash')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p: { new: Record<string, unknown> }) => {
        const AVG = 15000
        const added = Number(p.new.total) > 0 ? Number(p.new.total) : AVG
        setStats(s => ({ ...s, ordersToday: s.ordersToday + 1, ordersThisHour: s.ordersThisHour + 1, revenue: s.revenue + added }))
        // Refresh analytics (topItems + weekly) on each new order
        api.getAdminData().then(d => { setTop(d.topItems); setWeekly(d.weeklySales) })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (p: { new: Record<string, unknown> }) => {
        const r = p.new
        setNotifs(prev => [
          { table: r.table_ref as string, message: r.message as string, time: r.time as string, color: r.color as string },
          ...prev.slice(0, 9),
        ])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        api.getTables().then(tables => {
          setTableStats({ occupied: tables.filter(t => t.s !== 'g').length, total: tables.length })
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const lowStock = stock.filter(s => s.current < s.minimum)
  const maxVal   = Math.max(...weekly.map(w => w.val), 1)

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="text-right">
          <h1 className="text-[22px] font-semibold text-white">لوحة التحكم الرئيسية</h1>
          <p className="text-[12px] text-white/45 mt-0.5">صاج الريف - تحديث فوري</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-ok text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse inline-block" />
            مباشر
          </span>
          <button
            onClick={() => setShiftNum(n => n + 1)}
            className="bg-c3 border border-c4 text-white text-[12px] px-3 py-1.5 rounded-[9px] hover:bg-c4 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            إنهاء الوردية {shiftNum}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'الطلبات النشطة',    value: stats.ordersThisHour, sub: `3 من ساعة ماضت`, subCl: 'text-white/40' },
          { label: 'الطلبات اليوم',     value: stats.ordersToday,    sub: `▲ 12% من أمس`,   subCl: 'text-ok' },
          { label: 'المبيعات اليوم',    value: `${stats.revenue.toLocaleString()} د.ع`, sub: 'الجمعة', subCl: 'text-white/40' },
          { label: 'الطاولات المشغولة', value: `${tableStats.occupied} / ${tableStats.total}`, sub: 'طاولة مشغولة', subCl: 'text-white/40' },
        ].map((c, i) => (
          <div key={i} className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
            <div className="text-[11px] text-white/50 mb-1.5 text-right">{c.label}</div>
            <div className="text-[24px] font-semibold text-gold text-right">{c.value}</div>
            <div className={`text-[11px] mt-1 text-right ${c.subCl}`}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-warn text-[13px]">▲</span>
            <span className="text-[13px] font-medium text-warn">تنبيهات المخزن</span>
          </div>
          <div className="grid gap-2.5">
            {lowStock.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 border border-warn/20" style={{ background: 'rgba(232,160,32,0.06)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-warn text-[16px]">⚠</span>
                  <div className="text-right">
                    <span className="text-[13px] font-medium text-white">{s.name}</span>
                    <span className="text-[13px] text-white"> — المخزون منخفض!</span>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      المتوفر {s.current} {s.unit} · الحد الأدنى: {s.minimum} {s.unit}
                    </div>
                  </div>
                </div>
                <span className="badge badge-warn text-[11px]">منخفض</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Weekly Sales Bar Chart */}
        <div className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
          <div className="flex justify-between items-center mb-4 text-right">
            <button className="text-[11px] text-gold hover:text-gold-light transition-colors">عرض التقرير ←</button>
            <span className="text-[13px] font-medium text-white">مبيعات الأسبوع</span>
          </div>
          <div className="flex items-end gap-2 h-[110px]">
            {weekly.map((w, i) => {
              const hp = Math.round((w.val / maxVal) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gold font-medium">{w.val}م</span>
                  <div className="w-full rounded-t-[4px] bg-gold" style={{ height: `${hp}%`, minHeight: 8 }} />
                  <span className="text-[9px] text-white/40 text-center leading-tight">{w.day.slice(0, 3)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Section */}
        <div className="rounded-xl p-4 border border-gold/25" style={{ background: 'linear-gradient(145deg,#1A1200,#0D0D0D)' }}>
          <div className="flex justify-between items-center mb-3 text-right">
            <span className="badge badge-gold text-[10px]">توصيات ذرية</span>
            <span className="text-[13px] font-medium text-gold">ذكاء اصطناعي</span>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: '✓', color: 'text-ok',   text: '"حقّص سعر الستيك: الطلب منخفض"' },
              { icon: '▸', color: 'text-gold',  text: '"البيتزا تتزيد اليوم"' },
              { icon: '△', color: 'text-warn',  text: '"الطاولة 7 تنتظر 22 دقيقة"' },
            ].map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-[9px] p-2.5" style={{ background: 'rgba(220,169,92,0.08)', border: '1px solid rgba(220,169,92,0.12)' }}>
                <span className={`text-[13px] font-bold flex-shrink-0 ${ins.color}`}>{ins.icon}</span>
                <span className="text-[11px] text-gold-light leading-relaxed text-right">{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Feed + Analytics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Live Feed */}
        <div className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-white/40">الكل</span>
            <span className="text-[13px] font-medium text-white">التغذية الراجعة</span>
          </div>
          <div className="space-y-3">
            {notifs.slice(0, 10).map((n, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[11px] text-white/35 flex-shrink-0">{n.time} م</span>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.color }} />
                <span className="text-[12px] text-white/75 text-right flex-1">{n.message} — طاولة {n.table}</span>
              </div>
            ))}
            {notifs.length === 0 && (
              <div className="text-center py-4 text-white/25 text-[12px]">لا يوجد إشعارات بعد</div>
            )}
          </div>
        </div>

        {/* Analytics Donut */}
        <div className="rounded-xl p-4 border border-c3" style={{ background: '#111111' }}>
          <div className="text-[13px] font-medium text-white text-right mb-3">تحليلات</div>
          <div className="flex items-center justify-between gap-4">
            {/* SVG Donut */}
            <div className="relative w-[90px] h-[90px] flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#2A2A2A" strokeWidth="4" />
                {topItems.reduce<{ offset: number; els: JSX.Element[] }>((acc, t, i) => {
                  const circ = 2 * Math.PI * 14
                  const dash = (t.pct / 100) * circ
                  const el = (
                    <circle key={i} cx="18" cy="18" r="14" fill="none" stroke={t.color}
                      strokeWidth="4" strokeDasharray={`${dash} ${circ - dash}`}
                      strokeDashoffset={-acc.offset} strokeLinecap="round" />
                  )
                  return { offset: acc.offset + dash, els: [...acc.els, el] }
                }, { offset: 0, els: [] }).els}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-semibold text-gold">100</span>
                <span className="text-[9px] text-white/45">طلب</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-2">
              {topItems.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/60">{t.pct}%</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/80">{t.name}</span>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────
export default function AdminView() {
  const { adminSub, setAdminSub } = useStore()

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {adminSub === 'dashboard'    && <AdminDashboard />}
        {adminSub === 'menu'         && <MenuMgmt />}
        {adminSub === 'offers'       && <OffersMgmt />}
        {adminSub === 'sales'        && <SalesView />}
        {adminSub === 'shift'        && <ShiftView />}
        {adminSub === 'reservations' && <ReservationsView />}
        {adminSub === 'ratings'      && <RatingsView />}
        {adminSub === 'stock'        && <AdminStockView />}
        {adminSub === 'tables'       && <TablesView />}
      </div>

      {/* Right Sidebar */}
      <div className="w-[200px] border-r border-c3 flex flex-col py-4 flex-shrink-0" style={{ background: '#0D0D0D' }}>
        <div className="text-[10px] text-white/30 px-4 mb-3 tracking-widest text-right">الرئيسية</div>
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setAdminSub(item.id as any)}
            className={`w-full text-right px-4 py-2.5 text-[13px] flex items-center justify-between transition-all duration-150 cursor-pointer border-none
              ${adminSub === item.id
                ? 'bg-gold/10 text-gold font-medium border-r-2 border-gold'
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
            style={{ background: adminSub === item.id ? 'rgba(220,169,92,0.1)' : 'transparent' }}
          >
            <span className="text-right">{item.label}</span>
            {item.badge > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-err text-white flex-shrink-0">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
