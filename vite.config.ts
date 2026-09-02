import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Vercel 默认根路径 `/`；GitHub Pages 通过 VITE_BASE=/ys-personal-trainer/ 注入子路径。
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
  }
})
