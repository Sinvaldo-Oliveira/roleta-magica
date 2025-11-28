import { create } from 'zustand'

type UserState = {
  name: string
  phone: string
  setUser: (name?: string | null, phone?: string | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  name: '',
  phone: '',
  setUser: (name, phone) => set({ name: name ?? '', phone: phone ?? '' }),
  clearUser: () => set({ name: '', phone: '' }),
}))

