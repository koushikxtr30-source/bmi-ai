import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Register service worker — auto-updates silently in background
const updateSW = registerSW({
  onNeedRefresh() {
    // New content available — show a subtle reload prompt
    if (confirm('New version of mybmi.ai is available. Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('mybmi.ai is ready to work offline.')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
