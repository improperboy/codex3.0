import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  setAuth: (token: string, refreshToken: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) =>
        set({ token, refreshToken, user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'hackmate-auth' }
  )
)
