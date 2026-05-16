import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import MenuTab from './MenuTab'
import CartTab  from './CartTab'
import BillTab  from './BillTab'

type PhoneTab = 'home' | 'menu' | 'cart' | 'split' | 'qr'
type Lang = 'ar' | 'en'

const T = {
  ar: {
    home: 'الرئيسية', menu: 'القائمة', cart: 'السلة', split: 'تقاسم',
    tracking: 'تتبع الطلب المباشر',
    noOrder: 'لا يوجد طلب نشط',
    steps: ['تم الطلب', 'قيد التحضير', 'جاهز', 'تم التقديم'],
    smartCall: 'SMART CALL — نداء ذكي', smartSent: '✓ تم إرسال النداء',
    quickCalls: ['نادل', 'ماء', 'مناديل', 'أكياس'],
    details: '📋 وصف التفصيلي', book: '📅 حجز طاولة',
    billBtn: '💳 طلب الحساب', splitBtn: '✖ تقاسم الدفع',
    rateTitle: 'تقييم الخدمة والأكل',
    food: 'الطعام', service: 'الخدمة', overall: 'عام',
    comment: 'أضف تعليقاً...', submitRating: 'إرسال التقييم', ratingDone: '✓ شكراً على تقييمك!',
    qrSub: 'رمز QR · المسح المباشر',
  },
  en: {
    home: 'Home', menu: 'Menu', cart: 'Cart', split: 'Split',
    tracking: 'Live Order Tracking',
    noOrder: 'No active order',
    steps: ['Order Placed', 'Preparing', 'Ready', 'Served'],
    smartCall: 'SMART CALL', smartSent: '✓ Call Sent',
    quickCalls: ['Waiter', 'Water', 'Napkins', 'Bags'],
    details: '📋 Details', book: '📅 Book Table',
    billBtn: '💳 Request Bill', splitBtn: '✖ Split Bill',
    rateTitle: 'Rate your experience',
    food: 'Food', service: 'Service', overall: 'Overall',
    comment: 'Add a comment...', submitRating: 'Submit Rating', ratingDone: '✓ Thank you!',
    qrSub: 'QR Code · Direct Scan',
  },
}

interface Props {
  tableNum?: number
}

export default function CustomerView({ tableNum: tableNumProp }: Props) {
  // Read table number from URL params; prop takes precedence (for staff preview and testing selector)
  const params = new URLSearchParams(window.location.search)
  const tableNum  = tableNumProp ?? parseInt(params.get('table') || '1')
  const floor     = parseInt(params.get('floor') || '1')
  const TABLE     = `T${tableNum}`

  const [phoneTab, setPhoneTab] = useState<PhoneTab>('home')
  const [lang, setLang]         = useState<Lang>('ar')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { cart } = useStore()
  const cartCount = Object.values(cart).reduce((s, c) => s + c.qty, 0)
  const t = T[lang]

  // Open or resume session for this table
  useEffect(() => {
    api.openSession(tableNum).then(s => setSessionId(s.id)).catch(() => {})
  }, [tableNum])

  const restaurantTitle = lang === 'ar'
    ? `صاج الريف | طاولة ${tableNum} · طابق ${floor}`
    : `SAJ ALREEF | Table ${tableNum} · Floor ${floor}`

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: '#080808' }}>
      <div
        className="relative rounded-[32px] border-2 border-c3 overflow-hidden flex flex-col"
        style={{
          width: 320,
          height: 640,
          background: '#0D0D0D',
          boxShadow: '0 0 60px rgba(220,169,92,0.12), 0 30px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Phone header */}
        <div className="px-4 pt-4 pb-3 border-b border-c3 flex-shrink-0" style={{ background: '#111111' }}>
          <div className="flex justify-between items-start">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="text-[10px] text-white/50 bg-c2 border border-c3 rounded-[6px] px-2 py-0.5 hover:border-gold/40 hover:text-gold transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>
            <div className="text-right">
              <div className="text-[14px] font-semibold text-gold">{restaurantTitle}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{t.qrSub} {tableNum}</div>
            </div>
          </div>
        </div>

        {/* Phone content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {phoneTab === 'home'  && (
            <HomeScreen
              onNav={setPhoneTab}
              lang={lang}
              t={t}
              table={TABLE}
              tableNum={tableNum}
              sessionId={sessionId}
            />
          )}
          {phoneTab === 'menu'  && <MenuTab />}
          {phoneTab === 'cart'  && <CartTab table={TABLE} sessionId={sessionId ?? undefined} />}
          {phoneTab === 'split' && <BillTab table={TABLE} />}
          {phoneTab === 'qr'    && <QrScreen lang={lang} tableNum={tableNum} floor={floor} />}
        </div>

        {/* Bottom nav */}
        <div className="flex border-t border-c3 flex-shrink-0" style={{ background: '#111111' }}>
          {([
            { id: 'home'  as PhoneTab, icon: '🏠', label: t.home   },
            { id: 'menu'  as PhoneTab, icon: '📋', label: t.menu   },
            { id: 'cart'  as PhoneTab, icon: '🛒', label: t.cart,  badge: cartCount },
            { id: 'split' as PhoneTab, icon: '✖',  label: t.split  },
            { id: 'qr'    as PhoneTab, icon: '📷', label: 'QR'     },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setPhoneTab(tab.id)}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 cursor-pointer border-none transition-all duration-150"
              style={{ background: 'transparent' }}
            >
              <div className="relative">
                <span className="text-[18px]">{tab.icon}</span>
                {'badge' in tab && (tab.badge as number) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-err text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge as number}
                  </span>
                )}
              </div>
              <span className={`text-[9px] ${phoneTab === tab.id ? 'text-gold font-medium' : 'text-white/40'}`}>
                {tab.label}
              </span>
              {phoneTab === tab.id && <div className="w-1 h-1 rounded-full bg-gold mt-0.5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Home Screen ─────────────────────────────────────────────
function HomeScreen({
  onNav, lang, t, table, tableNum, sessionId,
}: {
  onNav: (tab: PhoneTab) => void
  lang: Lang
  t: typeof T['ar']
  table: string
  tableNum: number
  sessionId: string | null
}) {
  const [order, setOrder]             = useState<{ status: string; time: string } | null>(null)
  const [smartSent, setSmartSent]     = useState(false)
  const [sentCalls, setSentCalls]     = useState<Set<string>>(new Set())
  const [ratingFood, setRatingFood]   = useState(5)
  const [ratingService, setRatingService] = useState(4)
  const [ratingOverall, setRatingOverall] = useState(5)
  const [comment, setComment]         = useState('')
  const [ratingDone, setRatingDone]   = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [screen, setScreen]           = useState<'home' | 'booking' | 'details'>('home')

  useEffect(() => {
    supabase.from('orders').select('status, time').eq('table_ref', table).order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) setOrder(data[0])
    })

    const ch = supabase.channel(`customer-tracking-${table}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p: any) => {
        if (p.new.table_ref === table) setOrder({ status: p.new.status, time: p.new.time })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p: any) => {
        if (p.new.table_ref === table) setOrder(prev => prev ? { ...prev, status: p.new.status } : null)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [table])

  const steps = [
    { label: t.steps[0], time: order?.time ?? '', done: !!order },
    { label: t.steps[1], time: '', done: !!order },
    { label: t.steps[2], time: '', done: order?.status === 'ready' },
    { label: t.steps[3], time: '', done: false },
  ]

  async function doSmartCall() {
    setSmartSent(true)
    await api.sendAlert(table, 'نداء ذكي', '🔔')
    setTimeout(() => setSmartSent(false), 2000)
  }

  async function doQuickCall(type: string) {
    setSentCalls(prev => new Set(prev).add(type))
    const emoji = (type === 'نادل' || type === 'Waiter') ? '🧑‍🍳' : (type === 'ماء' || type === 'Water') ? '💧' : '🧻'
    await api.sendAlert(table, type, emoji)
    setTimeout(() => setSentCalls(prev => { const s = new Set(prev); s.delete(type); return s }), 2000)
  }

  async function submitRating() {
    setRatingLoading(true)
    await api.submitRating(ratingFood, ratingService, ratingOverall, comment, tableNum, sessionId ?? undefined)
    setRatingDone(true)
    setRatingLoading(false)
  }

  if (screen === 'booking') return <BookingScreen lang={lang} onBack={() => setScreen('home')} table={table} />
  if (screen === 'details') return <DetailsScreen lang={lang} onBack={() => setScreen('home')} />

  return (
    <div className="p-3.5 space-y-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Tracking */}
      <div className="rounded-[11px] p-3.5 border border-c3" style={{ background: '#151515' }}>
        <div className="text-[11px] font-medium text-gold text-right mb-3">{t.tracking}</div>
        {!order ? (
          <div className="text-center py-2 text-[11px] text-white/30">{t.noOrder}</div>
        ) : (
          <div className="space-y-2.5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${s.done ? 'border-gold bg-gold' : 'border-c3 bg-transparent'}`}>
                  {s.done && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <div className="text-right flex-1 ml-2 mr-2">
                  <span className={`text-[11px] ${s.done ? 'text-white' : 'text-white/35'}`}>{s.label}</span>
                  {s.time && <span className="text-[10px] text-white/30 mr-2 ml-2">{s.time}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Call */}
      <button
        onClick={doSmartCall}
        className={`w-full py-3 rounded-[11px] text-[13px] font-semibold transition-all duration-200 cursor-pointer border-none
          ${smartSent ? 'bg-ok/15 text-ok border border-ok/30' : 'text-black hover:opacity-90 active:scale-95'}`}
        style={!smartSent ? { background: '#DCA95C' } : {}}
      >
        {smartSent ? t.smartSent : t.smartCall}
      </button>

      {/* Quick calls */}
      <div className="grid grid-cols-4 gap-1.5">
        {t.quickCalls.map((item, i) => (
          <button
            key={i} onClick={() => doQuickCall(item)}
            className={`rounded-[9px] py-2 text-[11px] transition-all duration-200 cursor-pointer border
              ${sentCalls.has(item)
                ? 'border-gold text-black font-semibold'
                : 'bg-c2 border-c3 text-white/70 hover:border-gold/40 hover:text-gold'}`}
            style={sentCalls.has(item) ? { background: '#DCA95C' } : {}}
          >
            {sentCalls.has(item) ? '✓' : item}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setScreen('details')} className="bg-c2 border border-c3 rounded-[9px] py-2.5 text-[11px] text-white/70 hover:border-gold/40 transition-all cursor-pointer">
          {t.details}
        </button>
        <button onClick={() => setScreen('booking')} className="bg-c2 border border-c3 rounded-[9px] py-2.5 text-[11px] text-white/70 hover:border-gold/40 transition-all cursor-pointer">
          {t.book}
        </button>
      </div>

      <button
        onClick={() => onNav('split')}
        className="w-full py-2.5 rounded-[11px] text-[12px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
        style={{ background: '#DCA95C' }}
      >
        {t.billBtn}
      </button>

      <button
        onClick={() => onNav('split')}
        className="w-full py-2.5 rounded-[11px] text-[12px] font-medium bg-c2 border border-c3 text-white/70 hover:border-gold/40 transition-all cursor-pointer"
      >
        {t.splitBtn}
      </button>

      {/* Rating */}
      <div className="rounded-[11px] p-3.5 border border-c3" style={{ background: '#151515' }}>
        <div className="text-[11px] font-medium text-white/60 text-right mb-3">{t.rateTitle}</div>
        {ratingDone ? (
          <div className="text-center py-4 text-[13px] text-ok font-medium">{t.ratingDone}</div>
        ) : (
          <>
            <div className="space-y-2">
              {[
                { label: t.food,    val: ratingFood,    set: setRatingFood },
                { label: t.service, val: ratingService, set: setRatingService },
                { label: t.overall, val: ratingOverall, set: setRatingOverall },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => r.set(n)} className="text-[14px] cursor-pointer transition-all active:scale-75 border-none bg-transparent p-0">
                        {n <= r.val ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-white/50">{r.label}</span>
                </div>
              ))}
            </div>
            <input
              value={comment} onChange={e => setComment(e.target.value)}
              placeholder={t.comment}
              className="w-full mt-3 bg-c2 border border-c3 rounded-[8px] px-3 py-2 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 text-right"
              dir="rtl"
            />
            <button
              onClick={submitRating} disabled={ratingLoading}
              className="w-full mt-2.5 py-2 rounded-[9px] text-[12px] font-medium text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border-none"
              style={{ background: '#DCA95C' }}
            >
              {ratingLoading ? '...' : t.submitRating}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Booking Screen ──────────────────────────────────────────
function BookingScreen({ lang, onBack, table }: { lang: Lang; onBack: () => void; table: string }) {
  const [form, setForm] = useState({ name: '', phone: '', date: '', time: '', guests: '2' })
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(false)
  const isAr = lang === 'ar'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    setLoading(true)
    setError(false)
    try {
      await api.createReservation({
        firstName: form.name, lastName: '', phone: form.phone,
        date: form.date, time: form.time, guests: parseInt(form.guests) || 2,
        section: '', notes: '', tableRef: table,
      })
      setSent(true)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="p-3.5" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gold text-[18px] cursor-pointer bg-transparent border-none leading-none">←</button>
        <span className="text-[13px] font-semibold text-white">{isAr ? 'حجز طاولة' : 'Book a Table'}</span>
      </div>
      {sent ? (
        <div className="text-center py-10">
          <div className="text-[40px] mb-3">✅</div>
          <div className="text-[14px] font-semibold text-ok mb-2">{isAr ? 'تم تأكيد الحجز!' : 'Booking Confirmed!'}</div>
          <div className="text-[12px] text-white/45 mb-6">{isAr ? 'سنتصل بك للتأكيد' : "We'll confirm by phone"}</div>
          <button onClick={onBack} className="py-2 px-6 rounded-[9px] text-[12px] text-black cursor-pointer" style={{ background: '#DCA95C' }}>
            {isAr ? 'رجوع' : 'Back'}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input value={form.name} onChange={e => f('name', e.target.value)} placeholder={isAr ? 'الاسم *' : 'Name *'} required dir={isAr ? 'rtl' : 'ltr'}
            className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50" />
          <input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder={isAr ? 'رقم الهاتف *' : 'Phone *'} required type="tel"
            className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.date} onChange={e => f('date', e.target.value)} type="date"
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
            <input value={form.time} onChange={e => f('time', e.target.value)} type="time"
              className="bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50" />
          </div>
          <select value={form.guests} onChange={e => f('guests', e.target.value)} dir={isAr ? 'rtl' : 'ltr'}
            className="w-full bg-c2 border border-c3 rounded-[9px] px-3 py-2 text-[12px] text-white focus:outline-none focus:border-gold/50 cursor-pointer">
            {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{isAr ? `${n} أشخاص` : `${n} guests`}</option>)}
          </select>
          {error && (
            <div className="text-center text-[11px] text-err py-1">
              {isAr ? 'حدث خطأ، حاول مرة أخرى' : 'Error, please try again'}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-[11px] text-[13px] font-semibold text-black hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border-none"
            style={{ background: '#DCA95C' }}>
            {loading ? '...' : (isAr ? '✓ تأكيد الحجز' : '✓ Confirm Booking')}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Details Screen ───────────────────────────────────────────
function DetailsScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const isAr = lang === 'ar'
  const info = [
    { icon: '🕐', label: isAr ? 'أوقات العمل'  : 'Hours',    val: isAr ? 'يومياً 12 ظهراً – 12 منتصف الليل' : 'Daily 12PM – 12AM' },
    { icon: '📍', label: isAr ? 'الموقع'         : 'Location', val: isAr ? 'بغداد، الكرادة — بجانب دوار الكرادة' : 'Baghdad, Karrada' },
    { icon: '📞', label: isAr ? 'الهاتف'         : 'Phone',    val: '+964 770 123 4567' },
    { icon: '🌐', label: isAr ? 'واي فاي'        : 'Wi-Fi',    val: 'SajAlreef_Guest' },
    { icon: '🅿️', label: isAr ? 'موقف سيارات'   : 'Parking',  val: isAr ? 'مجاني أمام المطعم' : 'Free in front' },
  ]
  const cats = [
    { emoji: '🥩', name: isAr ? 'صاج'     : 'Saj'      },
    { emoji: '🍕', name: isAr ? 'بيتزا'   : 'Pizza'    },
    { emoji: '🥗', name: isAr ? 'مقبلات'  : 'Starters' },
    { emoji: '🍵', name: isAr ? 'مشروبات' : 'Drinks'   },
    { emoji: '🍯', name: isAr ? 'حلويات'  : 'Desserts' },
  ]
  return (
    <div className="p-3.5" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gold text-[18px] cursor-pointer bg-transparent border-none leading-none">←</button>
        <span className="text-[13px] font-semibold text-white">{isAr ? 'عن المطعم' : 'About'}</span>
      </div>
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-black text-[22px] font-bold mx-auto mb-2">S</div>
        <div className="text-[15px] font-semibold text-gold">{isAr ? 'صاج الريف' : 'SAJ ALREEF'}</div>
        <div className="text-[11px] text-white/40 mt-0.5">{isAr ? 'مطعم عراقي أصيل منذ 2008' : 'Authentic Iraqi cuisine since 2008'}</div>
      </div>
      <div className="space-y-2.5 mb-4">
        {info.map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-c2 border border-c3 rounded-[10px] px-3 py-2.5">
            <span className="text-[16px] flex-shrink-0">{item.icon}</span>
            <div className="text-right flex-1">
              <div className="text-[10px] text-white/40">{item.label}</div>
              <div className="text-[12px] text-white mt-0.5">{item.val}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-white/40 text-right mb-2">{isAr ? 'أقسام القائمة' : 'Menu Categories'}</div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-c2 border border-c3 rounded-full px-3 py-1">
            <span className="text-[14px]">{c.emoji}</span>
            <span className="text-[11px] text-white/70">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QR Screen ───────────────────────────────────────────────
function QrScreen({ lang, tableNum, floor }: { lang: Lang; tableNum: number; floor: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <div className="w-[140px] h-[140px] border-2 border-gold/50 rounded-[12px] flex items-center justify-center bg-c2">
        <div className="grid grid-cols-3 gap-1 opacity-70">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-[3px]" style={{ background: [0,2,6,8,4].includes(i) ? '#DCA95C' : 'rgba(220,169,92,0.15)' }} />
          ))}
        </div>
      </div>
      <div className="text-[13px] text-white/60 text-center">{lang === 'ar' ? 'امسح للوصول المباشر' : 'Scan for direct access'}</div>
      <div className="text-[11px] text-white/30 text-center">
        {lang === 'ar' ? `صاج الريف | طاولة ${tableNum} · طابق ${floor}` : `SAJ ALREEF | Table ${tableNum} · Floor ${floor}`}
      </div>
    </div>
  )
}
