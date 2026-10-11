import axios from 'axios'
import { useAuthStore } from '../store/auth'

// Use relative URL in dev (Vite proxy handles it), absolute URL in production
const BASE_URL = (import.meta.env.VITE_API_URL as string) || (import.meta.env.PROD ? 'https://ares-api-production.up.railway.app' : '')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000, // fail fast when backend is unreachable so demo fallback kicks in quickly
})

// Lazy import to avoid circular dependency at module load time
api.interceptors.request.use((config) => {
  try {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    /* Store not ready yet — skip auth header */
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState()
        // Demo tokens (local mode) don't need refresh
        if (refreshToken?.startsWith('demo_')) { logout(); return Promise.reject(error) }
        if (refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })
          setTokens(data.access_token, data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api.request(error.config)
        }
        logout()
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)
