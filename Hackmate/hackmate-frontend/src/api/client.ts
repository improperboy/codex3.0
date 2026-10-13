import axios from 'axios'
import { env } from '@/config/env'

const client = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage on every request
client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('hackmate-auth')
  if (raw) {
    try {
      const state = JSON.parse(raw)
      const token = state?.state?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // ignore parse errors
    }
  }
  return config
})

// On 401, clear auth and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest = err.config?.url?.includes('/auth/login')
      const isLoginPage = window.location.pathname === '/login'

      if (!isLoginRequest && !isLoginPage) {
        localStorage.removeItem('hackmate-auth')
        window.location.href = '/login'
      }
    }
    // Normalize non-JSON error responses (e.g. raw HTML "Internal Server Error")
    // so they don't get rendered as page content
    if (err.response && typeof err.response.data === 'string') {
      err.response.data = { detail: `Server error (${err.response.status})` }
    }
    return Promise.reject(err)
  }
)

export default client
