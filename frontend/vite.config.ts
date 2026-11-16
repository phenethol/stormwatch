import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const django = loadEnv(mode, process.cwd(), 'STORMWATCH_').STORMWATCH_DJANGO

  return {
    plugins: [react(), tailwind()],
    server: django ? {
      proxy: {
        '/api/v1': { target: django, changeOrigin: false },
        '/_allauth': { target: django, changeOrigin: false },
        '/accounts': { target: django, changeOrigin: false },
      },
    } : undefined,
  }
})