import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROD_API_BASE_URL = 'https://hackmateapi.dulify.in'
const PROD_WS_URL = 'wss://hackmateapi.dulify.in'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiRaw = env.VITE_API_BASE_URL
  const wsRaw = env.VITE_WS_URL

  if (command === 'build') {
    const api = (apiRaw ?? '').trim() || PROD_API_BASE_URL
    if (api.includes('localhost') || api.includes('127.0.0.1')) {
      throw new Error(
        `\n[BUILD-FAILURE] Production build detected but VITE_API_BASE_URL="${api}"\n` +
          `  points to a local dev address. Refusing to build.\n` +
          `  Set VITE_API_BASE_URL=${PROD_API_BASE_URL} (or your real backend domain).\n`,
      )
    }

    const ws = (wsRaw ?? '').trim() || PROD_WS_URL
    if (ws.includes('localhost') || ws.includes('127.0.0.1')) {
      throw new Error(
        `\n[BUILD-FAILURE] Production build detected but VITE_WS_URL="${ws}"\n` +
          `  points to a local dev address. Refusing to build.\n` +
          `  Set VITE_WS_URL=${PROD_WS_URL} (or your real backend WS domain).\n`,
      )
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
    },
    server: {
      port: 5173,
      proxy: {
        '/auth': 'http://localhost:8000',
        '/users': 'http://localhost:8000',
        '/teams': 'http://localhost:8000',
        '/scores': 'http://localhost:8000',
        '/rounds': 'http://localhost:8000',
        '/rankings': 'http://localhost:8000',
        '/submissions': 'http://localhost:8000',
        '/announcements': 'http://localhost:8000',
        '/support': 'http://localhost:8000',
        '/chatbot': 'http://localhost:8000',
        '^/admin/(analytics|settings|venue|export|recommendations|activity-logs|themes)': {
          target: 'http://localhost:8000',
          rewrite: (p) => p,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            charts: ['recharts'],
            motion: ['framer-motion'],
            lucide: ['lucide-react'],
          },
        },
      },
    },
  }
})
