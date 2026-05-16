import { create } from 'zustand'
import type { MenuItem, CartItem } from '../types/index'

type NavTab = 'admin' | 'customer' | 'kitchen' | 'pos' | 'reservations' | 'waiter'
type AdminSub = 'dashboard' | 'menu' | 'offers' | 'sales' | 'shift' | 'reservations' | 'ratings' | 'stock' | 'tables'
type KitchenSub = 'kds' | 'inventory' | 'alerts'

interface Store {
  activeTab: NavTab
  setActiveTab: (t: NavTab) => void

  adminSub: AdminSub
  setAdminSub: (s: AdminSub) => void

  kitchenSub: KitchenSub
  setKitchenSub: (s: KitchenSub) => void

  customerTab: number
  setCustomerTab: (n: number) => void

  menuCategory: string
  setMenuCategory: (cat: string) => void

  posCategory: string
  setPosCategory: (cat: string) => void

  cart: Record<number, CartItem>
  setCartQty: (item: MenuItem, delta: number) => void
  clearCart: () => void

  posCart: Record<number, { item: MenuItem; qty: number }>
  setPosCartQty: (item: MenuItem, delta: number) => void
  clearPosCart: () => void
}

export const useStore = create<Store>((set) => ({
  activeTab: 'admin',
  setActiveTab: (t) => set({ activeTab: t }),

  adminSub: 'dashboard',
  setAdminSub: (s) => set({ adminSub: s }),

  kitchenSub: 'kds',
  setKitchenSub: (s) => set({ kitchenSub: s }),

  customerTab: 0,
  setCustomerTab: (n) => set({ customerTab: n }),

  menuCategory: 'all',
  setMenuCategory: (cat) => set({ menuCategory: cat }),

  posCategory: 'all',
  setPosCategory: (cat) => set({ posCategory: cat }),

  cart: {},
  setCartQty: (item, delta) =>
    set((state) => {
      const cart = { ...state.cart }
      const qty = (cart[item.id]?.qty ?? 0) + delta
      if (qty <= 0) delete cart[item.id]
      else cart[item.id] = { item, qty }
      return { cart }
    }),
  clearCart: () => set({ cart: {} }),

  posCart: {},
  setPosCartQty: (item, delta) =>
    set((state) => {
      const posCart = { ...state.posCart }
      const qty = (posCart[item.id]?.qty ?? 0) + delta
      if (qty <= 0) delete posCart[item.id]
      else posCart[item.id] = { item, qty }
      return { posCart }
    }),
  clearPosCart: () => set({ posCart: {} }),
}))
