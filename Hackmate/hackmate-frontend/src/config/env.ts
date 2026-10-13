const DEV_API_BASE_URL = 'http://localhost:8000'
const DEV_WS_URL = 'ws://localhost:8000'
const PROD_API_BASE_URL_HINT = 'https://hackmateapi.dulify.in'
const PROD_WS_URL_HINT = 'wss://hackmateapi.dulify.in'

const MODE: string = import.meta.env.MODE
const DEV: boolean = import.meta.env.DEV
const PROD: boolean = import.meta.env.PROD

const rawApiBaseUrl: string = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const rawWsUrl: string = (import.meta.env.VITE_WS_URL ?? '').trim()

function requireEnv(
  _name: 'VITE_API_BASE_URL' | 'VITE_WS_URL',
  raw: string,
  prodExpected: string,
  devDefault: string,): string {
  if (raw !== '') {
    return raw
  }

  if (MODE === 'development') {
    return devDefault
  }

  if (MODE === 'test') {
    return devDefault
  }

  if (MODE === 'production') {
    return prodExpected
  }

  return prodExpected
}

export const env = {
  MODE,
  DEV,
  PROD,
  VITE_API_BASE_URL: requireEnv(
    'VITE_API_BASE_URL',
    rawApiBaseUrl,
    PROD_API_BASE_URL_HINT,
    DEV_API_BASE_URL,
  ),
  VITE_WS_URL: requireEnv(
    'VITE_WS_URL',
    rawWsUrl,
    PROD_WS_URL_HINT,
    DEV_WS_URL,
  ),
} as const

Object.freeze(env)

if (env.PROD) {
  const api = env.VITE_API_BASE_URL
  if (api.includes('localhost') || api.includes('127.0.0.1')) {
    throw new Error(
      `[env-build-failure] Production build detected but VITE_API_BASE_URL resolves to ` +
        `"${api}", which points to a local dev address.\n` +
        `  Set VITE_API_BASE_URL=${PROD_API_BASE_URL_HINT} (or your real backend domain) ` +
        `before running "vite build" or "vercel build".`,
    )
  }
  const ws = env.VITE_WS_URL
  if (ws.includes('localhost') || ws.includes('127.0.0.1')) {
    throw new Error(
      `[env-build-failure] Production build detected but VITE_WS_URL resolves to ` +
        `"${ws}", which points to a local dev address.\n` +
        `  Set VITE_WS_URL=${PROD_WS_URL_HINT} (or your real backend WS domain) ` +
        `before running "vite build" or "vercel build".`,
    )
  }
}
