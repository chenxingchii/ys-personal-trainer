import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'

const isAdminView = new URLSearchParams(window.location.search).get('admin') === '1'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Service Worker 不可用时仍可正常使用在线分析。
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdminView ? <Admin /> : <App />}</StrictMode>,
)
