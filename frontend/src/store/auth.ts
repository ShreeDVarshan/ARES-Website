import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user) => set({
        user,
        accessToken: user.access_token,
        refreshToken: user.refresh_token,
        isAuthenticated: true,
      }),
      setTokens: (access, refresh) => set((state) => ({
        accessToken: access,
        refreshToken: refresh,
        user: state.user
          ? { ...state.user, access_token: access, refresh_token: refresh }
          : null,
      })),
      logout: () => set({
        user: null, accessToken: null, refreshToken: null, isAuthenticated: false,
      }),
    }),
    {
      name: 'ares-auth-v2',   // bump version to clear stale persisted state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
