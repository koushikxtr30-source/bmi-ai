import type { User } from 'firebase/auth'
import type { UserProfile } from '@/types'

export function AccountPage({ profile, onEditProfile, user, onSignOut, onSignIn }: {
  profile: UserProfile | null
  onEditProfile: () => void
  user: User | null
  onSignOut: () => void
  onSignIn: () => void
}) {
  const heightDisplay = profile
    ? profile.unitSystem === 'imperial'
      ? `${profile.heightFt}'${profile.heightIn}"`
      : `${profile.height} cm`
    : '—'

  const lockedFeatures = [
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      ),
      title: 'Apple Health Sync', desc: 'Auto-import weight & workouts', tag: 'Coming soon', highlight: false,
    },
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
      title: 'Fitbit Integration', desc: 'Sync steps, heart rate & sleep', tag: 'Coming soon', highlight: false,
    },
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
      title: 'Go Pro', desc: 'AI insights, unlimited history & no ads', tag: 'Upgrade', highlight: true,
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold">Account</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your profile and settings</p>
      </div>

      {/* Auth card */}
      {user ? (
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{user.email?.charAt(0).toUpperCase() ?? '?'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">{user.displayName || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.displayName ? user.email : 'Signed in'}</p>
            </div>
          </div>
          <button onClick={onSignOut} className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            Sign out
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Not signed in</p>
            <p className="text-xs text-muted-foreground">Sign in to sync progress across devices</p>
          </div>
          <button onClick={onSignIn} className="text-xs font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0">
            Sign in
          </button>
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {profile?.name && profile.name !== 'there' ? profile.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">{profile?.name && profile.name !== 'there' ? profile.name : 'No name set'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {heightDisplay}{profile?.age ? ` · ${profile.age}y` : ''} · {profile?.sex ?? '—'} · {profile?.unitSystem ?? 'imperial'}
            </p>
          </div>
          <button onClick={onEditProfile} className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all flex-shrink-0">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: 'Height', value: heightDisplay },
            { label: 'Age', value: profile?.age ? `${profile.age} yrs` : '—' },
            { label: 'Sex', value: profile?.sex ? (profile.sex === 'male' ? '♂ Male' : '♀ Female') : '—' },
            { label: 'Units', value: profile?.unitSystem === 'metric' ? 'Metric' : 'Imperial' },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-secondary/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">{item.label}</p>
              <p className="text-sm font-medium capitalize">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Locked features */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Integrations & Pro</p>
        {lockedFeatures.map(f => (
          <div key={f.title} className={`flex items-center gap-4 px-4 py-4 rounded-xl border ${f.highlight ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card'} opacity-70`}>
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">{f.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${f.highlight ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground'}`}>
              {f.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Data & privacy */}
      <div className="flex items-center justify-center gap-5 py-3 border-t border-border/30">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Local only</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />No account needed</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Free</span>
      </div>
    </div>
  )
}
