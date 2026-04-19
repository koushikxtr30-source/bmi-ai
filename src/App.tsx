import { useState, useCallback, useEffect } from 'react'
import {
  onAuthStateChanged, signOut,
  type User
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { upsertProfile, saveCheckInToCloud, loadCheckInsFromCloud, loadProfileFromCloud, deleteCheckInsFromCloud, migrateLocalToCloud } from '@/lib/db'
import { loadCheckIns, saveCheckIn, deleteCheckIns, loadProfile, saveProfile, deleteProfile } from '@/lib/storage'
import type { UserProfile } from '@/types'
import { calculateDashboard } from '@/lib/calculations'
import { generateAIPlan } from '@/lib/aiPlan'
import { Toast } from '@/components/Toast'
import { InstallPrompt } from '@/components/InstallPrompt'
import { ArcGauge } from '@/components/ArcGauge'
import { SharedFields } from '@/components/SharedFields'
import { AIPlanSection } from '@/components/AIPlanSection'
import { AccountPage } from '@/components/AccountPage'
import { AuthPage } from '@/components/AuthPage'
import { ResultsPayoff } from '@/components/ResultsPayoff'
import { WelcomeAnimation } from '@/components/WelcomeAnimation'
import { ProgressPage } from '@/components/ProgressPage'
import { DashboardPage } from '@/components/DashboardPage'
import { DashboardPanel } from '@/components/DashboardPanel'
import { CheckinWizard } from '@/components/CheckinWizard'
import { HomePage } from '@/components/HomePage'
import { generateHealthPDF } from '@/lib/pdf'
import './App.css'
import {
  Info, Moon, Sun, Scale, Ruler, Activity,
  Flame, Zap, Percent, X, ChevronRight, ChevronLeft, ChevronDown,
  TrendingUp, BarChart2, Sparkles, Utensils, Dumbbell,
  Target, CheckCircle2, Clock, Leaf, Apple, Maximize2, Minimize2,
  Home, Trash2, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

// ─── Types ───────────────────────────────────────────���────────────────────────
type UnitSystem = 'metric' | 'imperial'
type Sex = 'male' | 'female'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese' | null

interface SharedInputs {
  weight: string; height: string; heightFt: string; heightIn: string; age: string; sex: Sex
}
interface BMIResult {
  bmi: number; category: BMICategory; label: string; color: string; tip: string
  idealWeightMin: number; idealWeightMax: number
}
interface BMRResult { bmr: number; formula: string }
interface TDEEResult { tdee: number; bmr: number; activityLabel: string; deficit: number; surplus: number }
interface BodyFatResult { bodyFat: number; fatMass: number; leanMass: number; category: string; color: string }
interface Dashboard { bmi: BMIResult | null; bmr: BMRResult | null; tdee: TDEEResult | null; bodyFat: BodyFatResult | null }

// ─── AI Plan Types ───────���────────────────────────────────────────────────────
interface MacroSplit { protein: number; carbs: number; fat: number }
interface DietOption {
  name: string; emoji: string; description: string
  calories: number; macros: MacroSplit
  foods: string[]; avoid: string[]
  tag: string
}
interface ExerciseDay {
  day: string; type: string; intensity: string
  duration: string; exercises: string[]
  rest: boolean
}
interface Milestone { week: number; label: string; target: string; action: string }
interface AIPlan {
  goal: 'lose' | 'maintain' | 'gain'
  goalLabel: string
  summary: string
  dietOptions: DietOption[]
  exerciseRoutine: ExerciseDay[]
  timeline: {
    currentBMI: number
    targetBMI: number
    targetWeight: number
    weeksToGoal: number
    weeklyChange: number
    milestones: Milestone[]
  }
  habits: string[]
  generatedBy: 'rule-based' | 'ai'
}

// ─── CheckIn Type & Storage ─────────────────────────────────────────────────
interface CheckIn {
  id: string
  date: string // ISO
  unitSystem: UnitSystem
  inputs: SharedInputs
  activityLevel: ActivityLevel
  dashboard: Dashboard
}

// storage helpers imported from @/lib/storage
// UserProfile type imported from @/types

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { value: 'sedentary'   as ActivityLevel, label: 'Sedentary',   multiplier: 1.2,   desc: 'Little or no exercise' },
  { value: 'light'       as ActivityLevel, label: 'Light',       multiplier: 1.375, desc: '1–3 days/week' },
  { value: 'moderate'    as ActivityLevel, label: 'Moderate',    multiplier: 1.55,  desc: '3–5 days/week' },
  { value: 'active'      as ActivityLevel, label: 'Active',      multiplier: 1.725, desc: '6–7 days/week' },
  { value: 'very_active' as ActivityLevel, label: 'Very Active', multiplier: 1.9,   desc: 'Hard training 2×/day' },
]

const BMI_SEGMENTS = [
  { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
  { from: -135, to: -54,  color: 'hsl(142 76% 45%)' },
  { from: -54,  to: -18,  color: 'hsl(35 95% 55%)' },
  { from: -18,  to: 0,    color: 'hsl(0 84% 60%)' },
]

// generateAIPlan imported from @/lib/aiPlan


// Toast, InstallPrompt, ArcGauge imported from @/components/

// ─── Shared Fields ────────────────────────────────────────────────────────────
// SharedFields, AIPlanSection imported from @/components/



// ─── Check-in Wizard ────────────────────────────────────────────────────────

// ─── Results Payoff Screen ─────────────────────────────────────────────────
// ─── Home Page ─────────────────────────────────────────────────────────────

export default function App() {
  // ─ Profile is the source of truth for constants (height, age, sex) ─
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile())
  const [isDark, setIsDark] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [dashboard, setDashboard] = useState<Dashboard>(() => {
    // Restore last check-in dashboard on app load
    const stored = loadCheckIns()
    return stored.length > 0 ? stored[stored.length - 1].dashboard : { bmi: null, bmr: null, tdee: null, bodyFat: null }
  })
  // inputs: during onboarding holds everything; during checkin only weight is used (rest from profile)
  const [inputs, setInputs] = useState<SharedInputs>({ weight: '', height: '', heightFt: '', heightIn: '', age: '', sex: 'male' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(() => {
    const stored = loadCheckIns()
    return stored.length > 0 ? stored[stored.length - 1].activityLevel : 'moderate'
  })
  const [neck, setNeck] = useState(''); const [waist, setWaist] = useState(''); const [hip, setHip] = useState('')
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null)
  const [wizardStep, setWizardStep] = useState<number>(1)
  const [onboardingName, setOnboardingName] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }
  // page: 'onboarding' when no profile; 'home' after setup; 'checkin' for new check-in; 'progress' for charts
  const [page, setPage] = useState<'onboarding' | 'results' | 'auth' | 'home' | 'checkin' | 'progress' | 'dashboard' | 'account'>(
    () => loadProfile() ? 'home' : 'onboarding'
  )
  const [authIntent, setAuthIntent] = useState<'signin' | 'signup'>('signup')

  // Helper to navigate to auth with explicit intent
  const goToAuth = (intent: 'signin' | 'signup' = 'signup') => {
    setAuthIntent(intent)
    setPage('auth')
  }

  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => loadCheckIns())

  // Derive unitSystem from profile (or default imperial for onboarding)
  const unitSystem: UnitSystem = profile?.unitSystem ?? 'imperial'
  // Onboarding-specific unit state (before profile exists)
  const [onboardingUnit, setOnboardingUnit] = useState<UnitSystem>('imperial')
  const activeUnit = profile ? unitSystem : onboardingUnit

  useEffect(() => { document.documentElement.className = isDark ? 'dark' : 'light' }, [isDark])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // Load check-ins from cloud
        const cloudCheckIns = await loadCheckInsFromCloud(u.uid)
        if (cloudCheckIns.length > 0) {
          // Cloud has data — use as source of truth
          localStorage.setItem('mybmi_checkins', JSON.stringify(cloudCheckIns))
          setCheckIns(cloudCheckIns)
          setDashboard(cloudCheckIns[cloudCheckIns.length - 1].dashboard)
          setShowWelcome(true)
          setTimeout(() => setShowWelcome(false), 3000)
        } else {
          // No cloud data — migrate any existing localStorage data up
          const local = loadCheckIns()
          if (local.length > 0) {
            await migrateLocalToCloud(u.uid, local)
            setCheckIns(local)
          }
        }

        // Restore profile from cloud if not in localStorage (returning user, new device)
        const localProf = loadProfile()
        if (!localProf) {
          const cloudProf = await loadProfileFromCloud(u.uid)
          if (cloudProf) {
            saveProfile(cloudProf as any)
            setProfile(cloudProf as any)
            setPage('home')
          }
        } else {
          // Profile exists locally — sync it up to cloud
          await upsertProfile(u.uid, {
            email: u.email,
            name: localProf.name,
            unit_system: localProf.unitSystem,
            height: localProf.height,
            height_ft: localProf.heightFt,
            height_in: localProf.heightIn,
            age: localProf.age,
            sex: localProf.sex,
          })
        }
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // ─ Calculate all 4 metrics silently ─
  const calcAllSilently = useCallback((
    inp: SharedInputs, unit: UnitSystem, activity: ActivityLevel,
    neckV: string, waistV: string, hipV: string, skipBodyFat: boolean
  ): Dashboard | null => {
    const result = calculateDashboard(inp, unit, activity, neckV, waistV, hipV, skipBodyFat)
    if (result) {
      setDashboard(result)
      setAiPlan(null)
    }
    return result
  }, [])

  // Onboarding complete: save profile + first check-in
  const handleOnboardingComplete = (skipBodyFat: boolean) => {
    const isEditingProfile = !!profileBackup
    const newProfile: UserProfile = {
      name: onboardingName.trim() || 'there',
      height: inputs.height,
      heightFt: inputs.heightFt,
      heightIn: inputs.heightIn,
      age: inputs.age,
      sex: inputs.sex,
      unitSystem: onboardingUnit,
      createdAt: profileBackup?.createdAt ?? new Date().toISOString(),
    }
    saveProfile(newProfile)
    setProfile(newProfile)
    setProfileBackup(null)
    // When editing profile, use the latest check-in weight so dashboard doesn't go stale
    const latestWeight = checkIns.length > 0 ? checkIns[checkIns.length - 1].inputs.weight : ''
    const effectiveInputs = isEditingProfile
      ? { ...inputs, weight: inputs.weight || latestWeight }
      : inputs
    const result = calcAllSilently(effectiveInputs, onboardingUnit, activityLevel, neck, waist, hip, skipBodyFat)
    if (result) {
      const newCheckIn: CheckIn = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        unitSystem: onboardingUnit,
        inputs: { ...inputs },
        activityLevel,
        dashboard: result,
      }
      const saved = saveCheckIn(newCheckIn)
      if (!saved) showToast('Could not save locally — storage may be full')
      setCheckIns(loadCheckIns())
      if (user) {
        saveCheckInToCloud(user.uid, newCheckIn).then(r => {
          if (!r.ok) showToast('Check-in saved locally but cloud sync failed')
        })
      }
    }
    if (user) {
      upsertProfile(user.uid, {
        email: user.email,
        name: newProfile.name,
        unit_system: newProfile.unitSystem,
        height: newProfile.height,
        height_ft: newProfile.heightFt,
        height_in: newProfile.heightIn,
        age: newProfile.age,
        sex: newProfile.sex,
      }).then(r => {
        if (!r.ok) showToast('Profile saved locally but cloud sync failed')
      })
    }
    if (isEditingProfile) {
      showToast('Profile updated ✓')
      setPage('home')
    } else {
      setPage('results') // payoff screen — auth gate follows
    }
  }

  // Check-in complete: merge weight into profile constants and recalculate
  const handleCheckinComplete = (skipBodyFat: boolean) => {
    if (!profile) {
      // Profile missing — send back to onboarding to set up profile
      showToast('Please set up your profile first')
      setPage('onboarding')
      return
    }
    const mergedInputs: SharedInputs = {
      weight: inputs.weight,
      height: profile.height,
      heightFt: profile.heightFt,
      heightIn: profile.heightIn,
      age: profile.age,
      sex: profile.sex,
    }
    const result = calcAllSilently(mergedInputs, profile.unitSystem, activityLevel, neck, waist, hip, skipBodyFat)
    if (result) {
      const newCheckIn: CheckIn = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        unitSystem: profile.unitSystem,
        inputs: mergedInputs,
        activityLevel,
        dashboard: result,
      }
      const saved = saveCheckIn(newCheckIn)
      if (!saved) {
        showToast('Could not save — storage may be full')
        return
      }
      setCheckIns(loadCheckIns())
      if (user) {
        upsertProfile(user.uid, {
          email: user.email,
          name: profile.name,
          unit_system: profile.unitSystem,
          height: profile.height,
          height_ft: profile.heightFt,
          height_in: profile.heightIn,
          age: profile.age,
          sex: profile.sex,
        }).then(() => saveCheckInToCloud(user.uid, newCheckIn)).then(r => {
          if (r && !r.ok) showToast('Saved locally but cloud sync failed')
        })
      }
    }

    showToast('Check-in saved ✓')
    setPage('dashboard')
  }

  const [profileBackup, setProfileBackup] = useState<UserProfile | null>(null)

  const handleEditProfile = () => {
    if (!profile) return
    setProfileBackup(profile)
    setOnboardingName(profile.name || '')
    setInputs(prev => ({
      ...prev,
      height: profile.height,
      heightFt: profile.heightFt,
      heightIn: profile.heightIn,
      age: profile.age,
      sex: profile.sex,
    }))
    setOnboardingUnit(profile.unitSystem)
    setProfile(null)
    setWizardStep(1)
    setPage('onboarding')
  }

  const handleEditProfileCancel = () => {
    // Restore backup profile and go back to home
    if (profileBackup) {
      saveProfile(profileBackup)
      setProfile(profileBackup)
    }
    setProfileBackup(null)
    setPage('home')
  }

  const handleNewCheckin = () => {
    setWizardStep(1)
    setInputs(prev => ({ ...prev, weight: '' })) // only clear weight
    setNeck(''); setWaist(''); setHip(''); setErrors({})
    setPage('checkin')
  }

  const handleInput = (field: keyof SharedInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setAiPlan(null) // reset plan when inputs change
  }

  const handleGeneratePlan = () => {
    if (!user) { goToAuth('signup'); return }
    // Use last check-in inputs if available, otherwise fall back to current inputs
    const effectiveInputs = checkIns.length > 0 ? checkIns[checkIns.length - 1].inputs : inputs
    const effectiveActivity = checkIns.length > 0 ? checkIns[checkIns.length - 1].activityLevel : activityLevel
    const plan = generateAIPlan(dashboard, effectiveInputs, activeUnit, effectiveActivity)
    setAiPlan(plan)
  }

  const handleUnitToggle = () => {
    const hasData = inputs.weight || inputs.height || inputs.heightFt || inputs.heightIn
    if (hasData && !window.confirm('Switching units will clear your measurements. Continue?')) return
    setOnboardingUnit(prev => prev === 'metric' ? 'imperial' : 'metric')
    setInputs(prev => ({ ...prev, weight: '', height: '', heightFt: '', heightIn: '' }))
    setErrors({}); setAiPlan(null)
  }
  const dashboardCount = [dashboard.bmi, dashboard.bmr, dashboard.tdee, dashboard.bodyFat].filter(Boolean).length

  // Auth loading — wait for Firebase to resolve before rendering
  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  // Auth page
  if (page === 'auth') return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthPage
        key={authIntent}
        onSuccess={() => { showToast('Welcome! 🎉'); setPage('home') }}
        onSkip={() => setPage('home')}
        isNewUser={authIntent === 'signup'}
      />
    </div>
  )

  return (
    <div className="bg-background text-foreground flex flex-col transition-colors duration-300" style={{ minHeight: '100dvh' }}>
      {/* Welcome animation — shown after sign-in for returning users */}
      <WelcomeAnimation
        name={profile?.name && profile.name !== 'there' ? profile.name : null}
        bmi={dashboard.bmi?.bmi ?? null}
        lastCheckin={checkIns.length > 0 ? checkIns[checkIns.length - 1].date : null}
        visible={showWelcome}
      />
      {/* ── Header ── */}
      <header className="border-b border-border/40 sticky top-0 z-30 bg-background/90 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={isDark ? '/icon-header.svg' : '/icon-header-light.svg'} alt="mybmi.ai" className="w-7 h-7 rounded-lg flex-shrink-0" />
            <span className="text-sm tracking-tight font-bold">
              <span className="text-primary">my</span><span className="text-foreground">bmi</span><span className="text-primary">.ai</span>
            </span>
            <span className="text-muted-foreground/60 text-xs hidden sm:block font-normal">Health Calculators</span>
          </div>
          <div className="flex items-center gap-2">
            {page !== 'onboarding' && (
              <>
                <button onClick={() => user ? setPage('progress') : goToAuth('signin')}
                  className={`hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border transition-colors font-medium ${page === 'progress' ? 'bg-secondary border-border text-foreground' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  <TrendingUp className="w-4 h-4" />Progress
                </button>
                <button onClick={handleNewCheckin}
                  className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                  + Check-in
                </button>
              </>
            )}
            {page !== 'onboarding' && (
              <button onClick={() => user ? setPage('account') : goToAuth('signin')}
                className={`hidden sm:flex items-center gap-1.5 px-2 h-9 rounded-md text-sm border transition-colors font-medium ${page === 'account' ? 'bg-secondary border-border text-foreground' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                aria-label="Account">
                {user ? (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                )}
                <span className="hidden md:block">{user ? 'Account' : 'Sign in'}</span>
              </button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-md hover:bg-secondary transition-colors" aria-label="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 sm:py-10 pb-28 sm:pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Hero — only shown on onboarding */}
          {page === 'onboarding' && (
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Free · No account · Private
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
                Know your{' '}
                <span className="text-primary">body</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                BMI, BMR, TDEE and Body Fat — your complete health baseline in minutes.
              </p>
            </div>
          )}

          {page === 'progress' ? (
            <ProgressPage
              checkIns={checkIns}
              unitSystem={activeUnit}
              onBack={() => setPage('home')}
              onClear={() => {
                deleteCheckIns()
                deleteProfile()
                if (user) deleteCheckInsFromCloud(user.uid)
                setCheckIns([])
                setDashboard({ bmi: null, bmr: null, tdee: null, bodyFat: null })
                setAiPlan(null)
                setProfile(null)
                setOnboardingName('')
                setInputs({ weight: '', height: '', heightFt: '', heightIn: '', age: '', sex: 'male' })
                setWizardStep(1)
                setPage('onboarding')
              }}
            />
          ) : page === 'dashboard' ? (
            <DashboardPage
              dashboard={dashboard}
              unitSystem={activeUnit}
              aiPlan={aiPlan}
              onGeneratePlan={handleGeneratePlan}
              inputs={checkIns.length > 0 ? checkIns[checkIns.length-1].inputs : inputs}
              activityLevel={activityLevel}
              onDownloadPDF={() => generateHealthPDF(dashboard, aiPlan, activeUnit, checkIns.length > 0 ? checkIns[checkIns.length-1].inputs : inputs)}
              onBack={() => setPage('home')}
              onNewCheckin={handleNewCheckin}
            />
          ) : page === 'results' ? (
            <ResultsPayoff
              dashboard={dashboard}
              unitSystem={activeUnit}
              name={profile?.name || onboardingName || ''}
              onContinue={() => {
                if (!user) { goToAuth('signup') }
                else { showToast('Welcome! 🎉'); setPage('home') }
              }}
            />
          ) : page === 'home' ? (
            <HomePage
              dashboard={dashboard}
              unitSystem={activeUnit}
              checkIns={checkIns}
              profile={profile}
              onNewCheckin={handleNewCheckin}
              onOpenDashboard={() => setPage('dashboard')}
              onViewProgress={() => user ? setPage('progress') : goToAuth('signin')}
              onEditProfile={handleEditProfile}
              aiPlan={aiPlan}
              user={user}
              onAiPlan={handleGeneratePlan}
              onViewPlan={() => setPage('dashboard')}
            />
          ) : page === 'checkin' ? (
            <CheckinWizard
              mode="checkin"
              profile={profile}
              step={wizardStep}
              onStep={setWizardStep}
              inputs={inputs}
              onInput={handleInput}
              errors={errors}
              onSetErrors={setErrors}
              unitSystem={activeUnit}
              onUnitToggle={handleUnitToggle}
              activityLevel={activityLevel}
              onActivity={setActivityLevel}
              neck={neck} waist={waist} hip={hip}
              onNeck={setNeck} onWaist={setWaist} onHip={setHip}
              onComplete={handleCheckinComplete}
              onCancel={() => setPage('home')}
            />
          ) : page === 'account' ? (
            <AccountPage
              profile={profile}
              onEditProfile={handleEditProfile}
              user={user}
              onSignOut={() => {
                signOut(auth)
                deleteCheckIns()
                deleteProfile()
                setCheckIns([])
                setProfile(null)
                setDashboard({ bmi: null, bmr: null, tdee: null, bodyFat: null })
                setAiPlan(null)
                setPage('onboarding')
              }}
              onSignIn={() => goToAuth('signin')}
            />
          ) : (
            // Onboarding — first-time setup or edit profile
            <>
            <CheckinWizard
              mode="onboarding"
              step={wizardStep}
              onStep={setWizardStep}
              name={onboardingName}
              onName={setOnboardingName}
              inputs={inputs}
              onInput={handleInput}
              errors={errors}
              onSetErrors={setErrors}
              unitSystem={onboardingUnit}
              onUnitToggle={handleUnitToggle}
              activityLevel={activityLevel}
              onActivity={setActivityLevel}
              neck={neck} waist={waist} hip={hip}
              onNeck={setNeck} onWaist={setWaist} onHip={setHip}
              onComplete={handleOnboardingComplete}
              onCancel={profileBackup ? handleEditProfileCancel : undefined}
            />

            {/* Sign in CTA — shown below wizard during onboarding only */}
            {page === 'onboarding' && !profileBackup && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}
            {page === 'onboarding' && !profileBackup && (
              <button onClick={() => goToAuth('signin')}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/60 bg-card hover:bg-secondary hover:border-border transition-all text-sm font-medium text-muted-foreground hover:text-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Already have an account? Sign in
              </button>
            )}
            </>
          )}

        </div>
      </main>

      {/* ── Bottom Tab Bar (mobile only) — hidden during onboarding ── */}
      <nav aria-label="Main navigation" className={`bottom-tab-bar transition-transform duration-300 ${(page === 'onboarding' || page === 'results') ? 'translate-y-full pointer-events-none' : ''}`}>
        {/* Home */}
        <button onClick={() => setPage('home')} className={`bottom-tab-item relative ${page === 'home' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Home" aria-current={page === 'home' ? 'page' : undefined}>
          {page === 'home' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        {/* Progress */}
        <button onClick={() => user ? setPage('progress') : goToAuth('signin')} className={`bottom-tab-item relative ${page === 'progress' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Progress" aria-current={page === 'progress' ? 'page' : undefined}>
          {page === 'progress' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="relative">
            <TrendingUp className="w-5 h-5" />
            {checkIns.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
          </div>
          <span className="text-[10px] font-medium">Progress</span>
        </button>
        {/* Check-in — center, pill CTA */}
        <button onClick={handleNewCheckin} className={`bottom-tab-item relative ${page === 'checkin' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="New Check-in">
          {page === 'checkin' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-medium">Check-in</span>
        </button>
        {/* Dashboard */}
        <button onClick={() => setPage('dashboard')} className={`bottom-tab-item relative ${page === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Dashboard" aria-current={page === 'dashboard' ? 'page' : undefined}>
          {page === 'dashboard' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="relative">
            <BarChart2 className="w-5 h-5" />
            {dashboardCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
          </div>
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        {/* Account */}
        <button onClick={() => setPage('account')} className={`bottom-tab-item relative ${page === 'account' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Account" aria-current={page === 'account' ? 'page' : undefined}>
          {page === 'account' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className="text-[10px] font-medium">Account</span>
        </button>
      </nav>

      <footer className="border-t border-border/50 py-5 mt-auto hidden sm:block">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><span>© 2025 mybmi.ai</span><span>•</span><span>A bsmawrt.com tool</span></div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Local storage only</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Privacy focused</span>
          </div>
        </div>
      </footer>

      <DashboardPanel
        dashboard={dashboard} open={dashboardOpen} onClose={() => setDashboardOpen(false)}
        unitSystem={activeUnit} aiPlan={aiPlan} onGeneratePlan={handleGeneratePlan}
        inputs={checkIns.length > 0 ? checkIns[checkIns.length-1].inputs : inputs}
        activityLevel={activityLevel}
        onDownloadPDF={() => generateHealthPDF(dashboard, aiPlan, activeUnit, checkIns.length > 0 ? checkIns[checkIns.length-1].inputs : inputs)}
      />

      <Toast message={toastMsg} visible={toastVisible} />
      <InstallPrompt />
    </div>
  )
}

