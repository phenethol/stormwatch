
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const django = loadEnv(mode, process.cwd(), 'STORMWATCH_').STORMWATCH_DJANGO

  return {
    plugins: [react()],
    server: django ? {
      proxy: {
        '/api/v1': { target: django, changeOrigin: false },
        '/_allauth': { target: django, changeOrigin: false },
        '/accounts': { target: django, changeOrigin: false },
      },
    } : undefined,
  }
})
