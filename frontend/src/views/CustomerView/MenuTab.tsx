import { useEffect, useState } from 'react'
import { menuData, BASE_IMG } from '../../data/menuData'
import type { MenuItem as StoreItem, Offer } from '../../types/index'
import { useStore } from '../../store/useStore'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'

// ─── Price parser ──────────────────────────────────────────────
function parsePrice(p: string): number {
  const m = p.replace(/,/g, '').match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

// ─── Category → StoreItem category ────────────────────────────
const STORE_CAT_MAP: Record<string, 'm' | 's' | 'd' | 'sw'> = {
  soups: 's', salads: 's',
  'hot-appetizers': 'm', 'cold-appetizers': 'm',
  saj: 'm', pasta: 'm', pizza: 'm', sandwiches: 'm', grills: 'm', kids: 'm', extras: 'm',
  desserts: 'd', icecream: 'd', chocolate: 'd',
  hotdrinks: 'sw', freshdrinks: 'sw', colddrinks: 'sw', softdrinks: 'sw',
  water: 'sw', milkshakes: 'sw', mocktails: 'sw', freshshisha: 'm',
}

// ─── Stable item map (built once at module load) ───────────────
let _mid = 10000
const menuItemMap = new Map<string, StoreItem>()
for (const cat of menuData) {
  for (const item of cat.items) {
    const mk = `${cat.id}::${item.a}`
    if (!menuItemMap.has(mk)) {
      menuItemMap.set(mk, {
        id: _mid++,
        name: item.a,
        desc: item.e ?? '',
        price: parsePrice(item.p),
        category: STORE_CAT_MAP[cat.id] ?? 'm',
        emoji: cat.icon,
      })
    }
  }
}

// ─── Injected CSS ──────────────────────────────────────────────
const CSS = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes fadeSlideDown {
  from { opacity: 0; transform: translateY(-16px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes shimmer {
  0%   { background-position: 200% center }
  100% { background-position: -200% center }
}
@keyframes sajMinusFade {
  from { opacity: 0 }
  to   { opacity: 1 }
}
.saj-menu-nav::-webkit-scrollbar { display: none }
.saj-menu-tab:hover { color: #DCA95C !important }
.saj-offers-bar::-webkit-scrollbar { display: none }
.saj-minus-btn { animation: sajMinusFade 0.15s ease }
.saj-card {
  background: #111111;
  border: 1px solid rgba(220,169,92,0.25);
  border-radius: 10px;
  padding: 14px 12px 10px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.saj-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, #DCA95C, #BF7A54);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.saj-card:hover { border-color: rgba(220,169,92,0.5); transform: translateY(-2px) }
.saj-card:hover::after { opacity: 1 }
`

// ─── Component ─────────────────────────────────────────────────
export default function MenuTab() {
  const [activeId, setActiveId] = useState(menuData[0]?.id ?? '')
  const [animKey, setAnimKey]   = useState(0)
  const [offers, setOffers]     = useState<Offer[]>([])

  const { cart, setCartQty } = useStore()

  useEffect(() => {
    if (document.getElementById('saj-menu-fonts')) return
    const link = document.createElement('link')
    link.id   = 'saj-menu-fonts'
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    api.getOffers().then(all => setOffers(all.filter(o => o.active)))
    const ch = supabase
      .channel('menu-offers-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        api.getOffers().then(all => setOffers(all.filter(o => o.active)))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleTab(id: string, btn: HTMLButtonElement) {
    if (id === activeId) return
    setActiveId(id)
    setAnimKey(k => k + 1)
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const cat = menuData.find(c => c.id === activeId)

  return (
    <div dir="rtl" style={{ background: '#0a0a0a', minHeight: '100%' }}>
      <style>{CSS}</style>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <div style={{
        padding: '32px 16px 24px',
        textAlign: 'center',
        direction: 'rtl',
        borderBottom: '1px solid rgba(220,169,92,0.15)',
        background: [
          'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(220,169,92,0.12) 0%, transparent 70%)',
          'repeating-linear-gradient(45deg, rgba(220,169,92,0.04) 0px, rgba(220,169,92,0.04) 1px, transparent 1px, transparent 12px)',
          '#0a0a0a',
        ].join(', '),
        animation: 'fadeSlideDown 0.6s ease both',
      }}>
        <div style={{ marginBottom: 16 }}>
          <img
            src="/logo.png"
            alt="صاج الريف"
            style={{
              width: 120, height: 120,
              border: '2px solid #DCA95C',
              borderRadius: 10,
              boxShadow: '0 0 30px rgba(220,169,92,0.25)',
              display: 'inline-block',
              objectFit: 'cover',
            }}
          />
        </div>

        <div style={{
          fontFamily: "'Tajawal', sans-serif",
          fontSize: '2.2rem',
          fontWeight: 800,
          lineHeight: 1.2,
          background: 'linear-gradient(90deg, #c8922a, #f5d080, #DCA95C, #f5d080, #c8922a)',
          backgroundSize: '300% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'shimmer 8s linear infinite',
          display: 'inline-block',
        }}>
          صاج الريف
        </div>

        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.75rem',
          color: 'rgba(220,169,92,0.5)',
          letterSpacing: '4px',
          marginTop: 4,
        }}>
          SAJ AL REEF
        </div>

        <div style={{
          width: 60, height: 1,
          background: 'linear-gradient(90deg, transparent, #DCA95C, transparent)',
          margin: '12px auto',
        }} />

        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
          فرع الكرادة — بغداد
        </div>
      </div>

      {/* ── Offers banner ────────────────────────────────────── */}
      {offers.length > 0 && (
        <div
          className="saj-offers-bar"
          style={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(220,169,92,0.1)',
            display: 'flex',
            gap: 8,
            background: '#0d0d0d',
          }}
        >
          {offers.map(o => (
            <div
              key={o.id}
              style={{
                flexShrink: 0,
                background: 'rgba(220,169,92,0.1)',
                border: '1px solid rgba(220,169,92,0.25)',
                borderRadius: 20,
                padding: '5px 12px',
                fontSize: '0.72rem',
                color: '#DCA95C',
                fontFamily: "'Tajawal', sans-serif",
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              🔥 {o.title}
            </div>
          ))}
        </div>
      )}

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <div
        className="saj-menu-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(220,169,92,0.25)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', padding: '0 8px', minWidth: 'max-content' }}>
          {menuData.map(c => (
            <button
              key={c.id}
              className="saj-menu-tab"
              onClick={e => handleTab(c.id, e.currentTarget)}
              style={{
                padding: '11px 12px',
                fontFamily: "'Tajawal', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 600,
                color: activeId === c.id ? '#DCA95C' : '#888888',
                background: 'none',
                border: 'none',
                borderBottom: activeId === c.id ? '2px solid #DCA95C' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.25s ease',
                outline: 'none',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section ──────────────────────────────────────────── */}
      {cat && (
        <div key={animKey} style={{ padding: '16px 12px', animation: 'fadeSlideUp 0.4s ease' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #b8872a, #DCA95C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontSize: '0.78rem', fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              flexShrink: 0,
            }}>
              {cat.icon}
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '1.25rem', fontWeight: 700,
              color: '#DCA95C', whiteSpace: 'nowrap',
            }}>
              {cat.label}
            </h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, #b8872a, transparent)' }} />
          </div>

          {/* Items grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {cat.items.map((item, i) => {
              const storeItem = menuItemMap.get(`${cat.id}::${item.a}`)
              const cartQty   = storeItem ? (cart[storeItem.id]?.qty ?? 0) : 0

              return (
                <div key={i} className="saj-card">

                  {/* Cart qty badge */}
                  {cartQty > 0 && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: '#DCA95C', color: '#000',
                      borderRadius: '50%', width: 18, height: 18,
                      fontSize: '0.6rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 5, fontFamily: "'Tajawal', sans-serif",
                    }}>
                      {cartQty}
                    </div>
                  )}

                  {/* Top row: Info | Price | Image */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>

                    {/* Info */}
                    <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Tajawal', sans-serif",
                        fontSize: '0.9rem', fontWeight: 600,
                        color: '#ffffff', lineHeight: 1.4,
                        marginBottom: 3, wordBreak: 'break-word',
                      }}>
                        {item.a}
                      </div>
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '0.7rem', color: '#888888',
                        fontStyle: 'italic', lineHeight: 1.3,
                      }}>
                        {item.e}
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: item.r ? '0.72rem' : '0.92rem',
                      fontWeight: 600, color: '#DCA95C',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      alignSelf: 'center', textAlign: 'center', lineHeight: 1.4,
                    }}>
                      {item.p}
                      <div style={{ fontSize: '0.65rem', color: 'rgba(220,169,92,0.7)', marginTop: 1 }}>
                        د.ع
                      </div>
                    </div>

                    {/* Image */}
                    <div style={{
                      width: 80, height: 70, flexShrink: 0,
                      borderRadius: 6, overflow: 'hidden',
                      background: '#1a1a1a',
                      border: '1px dashed rgba(220,169,92,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'center',
                    }}>
                      {item.img ? (
                        <img
                          src={`${BASE_IMG}${item.img}`}
                          alt={item.a}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => {
                            const el = e.currentTarget
                            el.style.display = 'none'
                            const ph = el.parentElement
                            if (ph) ph.innerHTML = '<div style="font-size:0.58rem;color:rgba(220,169,92,0.3);text-align:center;padding:6px;line-height:1.5;font-family:Tajawal,sans-serif">+ صورة</div>'
                          }}
                        />
                      ) : (
                        <div style={{
                          fontSize: '0.58rem',
                          color: 'rgba(220,169,92,0.3)',
                          textAlign: 'center', padding: 6, lineHeight: 1.5,
                          fontFamily: "'Tajawal', sans-serif",
                          userSelect: 'none',
                        }}>
                          + صورة
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom controls row */}
                  <div style={{
                    borderTop: '1px solid rgba(220,169,92,0.1)',
                    paddingTop: 8,
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    {/* − button: only when qty > 0 */}
                    {cartQty > 0 && storeItem && (
                      <button
                        className="saj-minus-btn"
                        onClick={e => { e.stopPropagation(); setCartQty(storeItem, -1) }}
                        style={{
                          width: 28, height: 28,
                          borderRadius: '50%',
                          background: 'transparent',
                          border: '1px solid #DCA95C',
                          color: '#DCA95C',
                          fontSize: '1rem', fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, flexShrink: 0,
                        }}
                      >
                        −
                      </button>
                    )}

                    {/* qty number: only when qty > 0 */}
                    {cartQty > 0 && (
                      <span style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '0.95rem', fontWeight: 700,
                        color: '#DCA95C',
                        minWidth: 20, textAlign: 'center',
                      }}>
                        {cartQty}
                      </span>
                    )}

                    {/* + button: always visible */}
                    {storeItem && (
                      <button
                        onClick={e => { e.stopPropagation(); setCartQty(storeItem, 1) }}
                        style={{
                          width: cartQty > 0 ? 28 : 'auto',
                          height: 28,
                          borderRadius: cartQty > 0 ? '50%' : 14,
                          padding: cartQty > 0 ? 0 : '0 14px',
                          background: '#DCA95C',
                          border: 'none',
                          color: '#000',
                          fontSize: cartQty > 0 ? '1rem' : '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: "'Tajawal', sans-serif",
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {cartQty > 0 ? '+' : 'أضف'}
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
