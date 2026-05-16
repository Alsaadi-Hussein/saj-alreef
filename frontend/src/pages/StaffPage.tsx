import { useEffect, useState } from 'react'
import AdminView        from '../views/AdminView'
import KitchenView      from '../views/KitchenView'
import CustomerView     from '../views/CustomerView'
import PosView          from '../views/PosView'
import ReservationsView from '../views/ReservationsView'
import WaiterView       from '../views/WaiterView'
import { useStore }  from '../store/useStore'
import { api }       from '../lib/api'
import { supabase }  from '../lib/supabase'

type NavTab = 'admin' | 'customer' | 'kitchen' | 'pos' | 'reservations' | 'waiter'

export default function StaffPage() {
  const { activeTab, setActiveTab } = useStore()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    api.getAlerts().then(a => setAlertCount(a.length))
    const ch = supabase.channel('staff-alerts-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setAlertCount(c => c + 1)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alerts' }, () => {
        api.getAlerts().then(a => setAlertCount(a.length))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const NAV: { id: NavTab; label: string; badge?: number }[] = [
    { id: 'admin',        label: 'لوحة الإدارة' },
    { id: 'customer',     label: 'تطبيق الزبون' },
    { id: 'kitchen',      label: 'المطبخ',        badge: alertCount > 0 ? alertCount : undefined },
    { id: 'pos',          label: 'POS'            },
    { id: 'reservations', label: 'الحجوزات'       },
    { id: 'waiter',       label: 'النادل'         },
  ]

  return (
    <div className="h-screen flex flex-col bg-bk overflow-hidden" dir="rtl">
      {/* ── Top Nav Bar ── */}
      <header
        className="flex items-center justify-between border-b border-c3 flex-shrink-0"
        style={{ background: '#0A0A0A', height: 48, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* Left: action buttons */}
        <div className="flex items-center gap-2">
          <button className="text-[11px] text-white/50 bg-c2 border border-c3 rounded-[7px] px-2.5 py-1.5 hover:bg-c3 hover:text-white transition-all cursor-pointer">
            طابع #
          </button>
          <button className="text-[11px] text-white/50 bg-c2 border border-c3 rounded-[7px] px-2.5 py-1.5 hover:bg-c3 hover:text-white transition-all cursor-pointer">
            دع
          </button>
        </div>

        {/* Center: nav tabs */}
        <nav className="flex items-stretch h-full">
          {NAV.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="relative flex items-center gap-1.5 px-5 text-[13px] font-medium transition-all duration-150 cursor-pointer border-none h-full"
              style={{
                background: 'transparent',
                color: activeTab === t.id ? '#DCA95C' : 'rgba(255,255,255,0.5)',
                borderBottom: activeTab === t.id ? '2px solid #DCA95C' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.badge && t.badge > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: '#E24B4A' }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right: Logo */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-[11px] font-medium text-white">صاج الريف</div>
            <div className="text-[9px] text-white/35">النظام الرقمي</div>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-black text-[14px] font-bold flex-shrink-0"
            style={{ background: '#DCA95C' }}
          >
            S
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'admin'        && <AdminView />}
        {activeTab === 'customer'     && <CustomerView tableNum={1} />}
        {activeTab === 'kitchen'      && <KitchenView />}
        {activeTab === 'pos'          && <PosView />}
        {activeTab === 'reservations' && <ReservationsView />}
        {activeTab === 'waiter'       && <WaiterView />}
      </div>
    </div>
  )
}
