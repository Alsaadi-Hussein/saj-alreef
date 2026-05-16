import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'

interface DaySales  { day: string; val: number; orders: number }
interface TodayStat { ordersCount: number; revenue: number; activeOrders: number }
interface TopItem   { name: string; count: number; pct: number; color: string }

export default function SalesView() {
  const [week,     setWeek]     = useState<DaySales[]>([])
  const [today,    setToday]    = useState<TodayStat>({ ordersCount: 0, revenue: 0, activeOrders: 0 })
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [loading,  setLoading]  = useState(true)

  async function loadData() {
    const data = await api.getSalesData()
    setWeek(data.week)
    setToday(data.today)
    setTopItems(data.topItems)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const ch = supabase.channel('sales-view-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const weekTotal  = week.reduce((s, d) => s + d.val, 0)
  const weekOrders = week.reduce((s, d) => s + d.orders, 0)
  const max        = Math.max(...week.map(d => d.val), 1)
  const hasData    = weekOrders > 0

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#343434 transparent' }}>
      <div className="flex justify-between items-center mb-5">
        <span className="badge badge-ok text-[11px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse inline-block" />
          بيانات حية
        </span>
        <h1 className="text-[20px] font-semibold text-white">تقرير المبيعات</h1>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/40">جارٍ التحميل...</div>
      ) : (
        <>
          {/* Today's live stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'طلبات اليوم',  value: today.ordersCount,              suffix: '' },
              { label: 'إيراد اليوم',  value: today.revenue.toLocaleString(), suffix: ' د.ع' },
              { label: 'طلبات نشطة',   value: today.activeOrders,             suffix: '' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-4 border border-c3 text-right" style={{ background: '#111111' }}>
                <div className="text-[11px] text-white/45 mb-1">{c.label}</div>
                <div className="text-[20px] font-semibold text-gold">{c.value}{c.suffix}</div>
              </div>
            ))}
          </div>

          {/* Weekly summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'إجمالي الأسبوع', value: hasData ? `${(weekTotal / 1000).toFixed(0)}K د.ع` : '—' },
              { label: 'عدد الطلبات',    value: weekOrders },
              { label: 'متوسط الطلب',    value: weekOrders > 0 ? `${Math.round(weekTotal / weekOrders).toLocaleString()} د.ع` : '—' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-4 border border-c3 text-right" style={{ background: '#111111' }}>
                <div className="text-[11px] text-white/45 mb-1">{c.label}</div>
                <div className="text-[20px] font-semibold text-gold">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl p-5 border border-c3 mb-5" style={{ background: '#111111' }}>
            <div className="text-[13px] font-medium text-white text-right mb-4">مبيعات الأسبوع</div>
            {!hasData ? (
              <div className="text-center py-8 text-white/25 text-[13px]">لا توجد بيانات</div>
            ) : (
              <div className="flex items-end gap-2 h-[140px]">
                {week.map((d, i) => {
                  const hp = Math.round((d.val / max) * 120)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gold font-medium">
                        {d.val > 0 ? `${(d.val / 1000).toFixed(0)}K` : ''}
                      </span>
                      <div
                        className="w-full rounded-t-[5px] transition-all duration-500"
                        style={{ height: Math.max(hp, d.val > 0 ? 4 : 0), background: d.val > 0 ? '#DCA95C' : '#2A2A2A' }}
                      />
                      <span className="text-[9px] text-white/40 text-center">{d.day.slice(0, 3)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Daily breakdown table */}
          {hasData && (
            <div className="rounded-xl border border-c3 overflow-hidden mb-5" style={{ background: '#111111' }}>
              <div className="grid grid-cols-3 px-4 py-2.5 border-b border-c3" style={{ background: '#151515' }}>
                <span className="text-[11px] text-white/50 text-center">الطلبات</span>
                <span className="text-[11px] text-white/50 text-center">المبيعات</span>
                <span className="text-[11px] text-white/50 text-right">اليوم</span>
              </div>
              {week.map((d, i) => (
                <div key={i} className={`grid grid-cols-3 px-4 py-3 ${i < week.length - 1 ? 'border-b border-c3/50' : ''}`}>
                  <span className="text-[12px] text-white/60 text-center">{d.orders}</span>
                  <span className="text-[12px] text-gold font-medium text-center">
                    {d.val > 0 ? d.val.toLocaleString() : '—'}
                  </span>
                  <span className="text-[12px] text-white text-right">{d.day}</span>
                </div>
              ))}
            </div>
          )}

          {/* Top items */}
          {topItems.length > 0 ? (
            <div className="rounded-xl p-5 border border-c3" style={{ background: '#111111' }}>
              <div className="text-[13px] font-medium text-white text-right mb-4">تحليلات الأصناف</div>
              <div className="space-y-3">
                {topItems.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] text-white/50 flex-shrink-0 w-8 text-left">{t.pct}%</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.pct}%`, background: t.color }} />
                    </div>
                    <span className="text-[12px] text-white text-right flex-shrink-0" style={{ minWidth: 110 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !hasData && (
              <div className="rounded-xl p-8 border border-c3 text-center" style={{ background: '#111111' }}>
                <div className="text-[13px] text-white/25">لا توجد بيانات بعد</div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
