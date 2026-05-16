import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../lib/api'

export default function CartTab({ table = 'T1', sessionId }: { table?: string; sessionId?: string }) {
  const { cart, setCartQty, clearCart } = useStore()
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)

  const items    = Object.values(cart)
  const hasItems = items.length > 0
  const total    = items.reduce((s, c) => s + c.item.price * c.qty, 0)

  async function confirmOrder() {
    if (loading || sent) return
    setLoading(true)
    const itemStr = items.map(c => `${c.item.name} (${c.qty})`).join('، ')
    await api.placeOrder(itemStr, table, sessionId, total)
    setLoading(false)
    setSent(true)
    clearCart()
  }

  return (
    <div className="p-3.5">
      {!hasItems && !sent && (
        <div className="text-center py-14 text-c4">
          <div className="text-5xl mb-2.5">🛒</div>
          <div className="text-[13px]">السلة فارغة</div>
        </div>
      )}

      {hasItems && (
        <>
          <div>
            {items.map(c => (
              <div
                key={c.item.id}
                className="flex justify-between items-center p-3 bg-c2 border border-c3 rounded-[11px] mb-2 animate-slide-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.item.emoji}</span>
                  <div>
                    <div className="text-[12px] font-medium text-white">{c.item.name}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      × {c.qty} = {(c.item.price * c.qty).toLocaleString()} د.ع
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCartQty(c.item, -c.qty)}
                  className="text-[11px] text-err bg-transparent border border-c4 rounded-[7px] px-2 py-1 cursor-pointer hover:border-err transition-colors duration-200"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between p-3 bg-c2 border border-c3 rounded-[11px] mt-2.5 mb-3">
            <span className="text-[12px] text-white/60">المجموع الكلي</span>
            <span className="text-[16px] font-medium text-gold">{total.toLocaleString()} د.ع</span>
          </div>

          <button
            onClick={confirmOrder}
            disabled={loading || sent}
            className="w-full py-2.5 rounded-[9px] text-[12px] font-medium bg-gold text-black
              hover:bg-gold-light active:scale-97 transition-all duration-200 animate-pulse-gold disabled:opacity-70"
          >
            {loading ? 'جارٍ الإرسال...' : 'تأكيد الطلب للمطبخ 🍽️'}
          </button>
        </>
      )}

      {sent && (
        <div className="text-center mt-2.5 text-[12px] text-gold animate-fade-in">
          ✓ وصل طلبك للمطبخ!
        </div>
      )}
    </div>
  )
}
