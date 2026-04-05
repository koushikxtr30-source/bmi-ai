export function WelcomeAnimation({ name, bmi, lastCheckin, visible }: {
  name: string | null
  bmi: number | null
  lastCheckin: string | null
  visible: boolean
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const daysAgo = lastCheckin
    ? Math.floor((Date.now() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const lastCheckinText = daysAgo === 0
    ? 'Checked in today'
    : daysAgo === 1
    ? 'Last check-in yesterday'
    : daysAgo !== null
    ? `Last check-in ${daysAgo} days ago`
    : null

  return (
    <div className={`fixed inset-0 z-50 bg-background flex flex-col items-center justify-center transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`flex flex-col items-center gap-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <img src="/icon-welcome.svg" alt="mybmi.ai" className="w-16 h-16" />
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{greeting}{name ? `, ${name}` : ''}</h1>
          <p className="text-sm text-muted-foreground">Welcome back to mybmi.ai</p>
        </div>
        {(bmi || lastCheckinText) && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border/60">
            {bmi && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">BMI</p>
                <p className="text-xl font-bold text-primary">{bmi}</p>
              </div>
            )}
            {bmi && lastCheckinText && <div className="w-px h-8 bg-border" />}
            {lastCheckinText && <p className="text-sm text-muted-foreground">{lastCheckinText}</p>}
          </div>
        )}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
