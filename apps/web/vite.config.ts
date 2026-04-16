import react from '@vitejs/plugin-react-swc'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/v1': {
          target: env.VITE_API_BASE_URL ?? 'http://localhost:4004',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'node',
      coverage: {
        provider: 'v8',
        include: ['src/**'],
      },
    },
  }
})
