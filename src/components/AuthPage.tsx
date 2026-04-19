import { useState } from 'react'
import {
  signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth'
import { auth, googleProvider, appleProvider } from '@/lib/firebase'
import { Input } from '@/components/ui/input'

export function AuthPage({ onSuccess, onSkip, isNewUser }: {
  onSuccess: () => void; onSkip?: () => void; isNewUser?: boolean
}) {
  const [mode, setMode] = useState<'choose' | 'email'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(isNewUser ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try { await signInWithPopup(auth, googleProvider); onSuccess() }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleApple = async () => {
    setLoading(true); setError('')
    try { await signInWithPopup(auth, appleProvider); onSuccess() }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleEmail = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError('')
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
      onSuccess()
    } catch (e: any) {
      const msg = e.code === 'auth/user-not-found' ? 'No account found. Try signing up.'
        : e.code === 'auth/wrong-password' ? 'Incorrect password.'
        : e.code === 'auth/email-already-in-use' ? 'Email already in use. Try signing in.'
        : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
        : e.message
      setError(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/icon-auth.svg" alt="mybmi.ai" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">{isNewUser ? 'Save your progress' : 'Welcome back'}</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'email'
              ? (isSignUp ? 'Create an account to sync your data across devices' : 'Sign in to access your data')
              : isNewUser
                ? 'Sign in to unlock Progress tracking and AI Health Plans across all your devices'
                : 'Sign in to load your data and continue tracking'}
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm disabled:opacity-50"
              aria-label="Sign in with Google">
              {loading ? <span className="btn-spinner" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
            <button onClick={handleApple} disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm disabled:opacity-50"
              aria-label="Sign in with Apple">
              {loading ? <span className="btn-spinner" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Apple'}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button onClick={() => setMode('email')} disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors font-medium text-sm disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              Continue with Email
            </button>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            {onSkip && (
              <button onClick={onSkip} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
                Skip for now
              </button>
            )}
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-12" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-12" />
            <button onClick={handleEmail} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              aria-label={isSignUp ? 'Create account' : 'Sign in'}>
              {loading && <span className="btn-spinner" />}
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
            <button onClick={() => { setMode('choose'); setError('') }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
              ← Back
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground">Your data is private and only accessible to you.</p>
      </div>
    </div>
  )
}
