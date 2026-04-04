import { useState, useEffect } from 'react'

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem('pwa-dismissed')) return
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setVisible(false)
    setPrompt(null)
    if (outcome === 'dismissed') sessionStorage.setItem('pwa-dismissed', '1')
  }

  const handleDismiss = () => {
    setVisible(false)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-[72px] sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 z-50 animate-fade-in-up">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <img src="/icon-192.png" alt="mybmi.ai" className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground mt-0.5">Install mybmi.ai for quick access, works offline too.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall}
              className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              Install
            </button>
            <button onClick={handleDismiss}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
