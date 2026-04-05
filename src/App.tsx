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
function CheckinWizard({
  mode = 'onboarding', profile,
  step, onStep, name = '', onName,
  inputs, onInput, errors, onSetErrors,
  unitSystem, onUnitToggle, activityLevel, onActivity,
  neck, waist, hip, onNeck, onWaist, onHip, onComplete, onCancel,
}: {
  mode?: 'onboarding' | 'checkin'
  profile?: UserProfile | null
  step: number; onStep: (s: number) => void
  name?: string; onName?: (v: string) => void
  inputs: SharedInputs; onInput: (f: keyof SharedInputs, v: string) => void
  errors: Record<string,string>; onSetErrors: (e: Record<string,string>) => void
  unitSystem: UnitSystem; onUnitToggle: () => void
  activityLevel: ActivityLevel; onActivity: (a: ActivityLevel) => void
  neck: string; waist: string; hip: string
  onNeck: (v: string) => void; onWaist: (v: string) => void; onHip: (v: string) => void
  onComplete: (skipBodyFat: boolean) => void
  onCancel?: () => void
}) {
  const mUnit = unitSystem === 'metric' ? 'cm' : 'in'
  const iCls = (err?: string) => `h-12 text-base ${err ? 'border-destructive' : ''}`

  // Onboarding: 6 steps. Checkin: 3 steps.
  const OB_STEPS = ['Name', 'Weight', 'Height', 'About you', 'Activity', 'Body']
  const CI_STEPS = ['Weight', 'Activity', 'Body']
  const STEPS = mode === 'onboarding' ? OB_STEPS : CI_STEPS
  const totalSteps = STEPS.length

  const validateMeasurements = () => {
    const e: Record<string,string> = {}
    const w = parseFloat(inputs.weight)
    if (!w || w <= 0) e.weight = 'Enter a valid weight'
    if (unitSystem === 'metric') {
      if (!parseFloat(inputs.height) || parseFloat(inputs.height) <= 0) e.height = 'Enter a valid height'
    } else {
      if (((parseFloat(inputs.heightFt)||0)*12 + (parseFloat(inputs.heightIn)||0)) <= 0) e.height = 'Enter a valid height'
    }
    onSetErrors(e)
    return Object.keys(e).length === 0
  }

  const validateWeight = () => {
    const e: Record<string,string> = {}
    const w = parseFloat(inputs.weight)
    if (!w || w <= 0) e.weight = 'Enter a valid weight'
    onSetErrors(e)
    return Object.keys(e).length === 0

  }

  const validateHeight = () => {
    const e: Record<string,string> = {}
    if (unitSystem === 'metric') {
      if (!parseFloat(inputs.height) || parseFloat(inputs.height) <= 0) e.height = 'Enter a valid height'
    } else {
      if (((parseFloat(inputs.heightFt)||0)*12 + (parseFloat(inputs.heightIn)||0)) <= 0) e.height = 'Enter a valid height'
    }
    onSetErrors(e)
    return Object.keys(e).length === 0
  }

  const validateAboutYou = () => {
    const e: Record<string,string> = {}
    // age is optional, but if entered must be valid
    if (inputs.age && (parseInt(inputs.age) < 1 || parseInt(inputs.age) > 120)) e.age = 'Enter a valid age (1–120)'
    onSetErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-5">
      {/* ── Step progress bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Step {step} of {totalSteps}</span>
          <span className="text-xs text-muted-foreground">{STEPS[step - 1]}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              i + 1 < step ? 'bg-primary' : i + 1 === step ? 'bg-primary/60' : 'bg-border'
            }`} />
          ))}
        </div>
      </div>

      {/* ════════════════════════ ONBOARDING STEPS ════════════════════════ */}
      {mode === 'onboarding' && (
        <>
          {/* ── Onboarding Step 1: Name ── */}
          {step === 1 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg></div>
                <CardTitle className="text-2xl font-bold">What should we call you?</CardTitle>
                <CardDescription className="text-sm mt-1">We'll use your name to personalize your experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">First name</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={e => onName?.(e.target.value)}
                    className="h-12 text-base"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onStep(2)}
                  />
                  <p className="text-xs text-muted-foreground">Optional — skip if you prefer</p>
                </div>
                <div className="flex gap-3">
                  {onCancel && (
                    <button onClick={onCancel} style={{ minHeight: '52px' }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  )}
                  <button onClick={() => onStep(2)} style={{ minHeight: '56px' }}
                    className={`flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90 ${onCancel ? 'flex-[2]' : 'w-full'}`}>
                    {name.trim() ? `Nice to meet you, ${name.trim()}!` : 'Continue'} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding Step 2: Weight ── */}
          {step === 2 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Scale className="w-6 h-6 text-primary" /></div>
                <CardTitle className="text-2xl font-bold">How much do you weigh?</CardTitle>
                <CardDescription className="text-sm mt-1">Used to calculate your BMI and health metrics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${unitSystem === 'metric' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Metric</span>
                  <Switch checked={unitSystem === 'imperial'} onCheckedChange={onUnitToggle} />
                  <span className={`text-sm ${unitSystem === 'imperial' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Imperial</span>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Scale className="w-4 h-4 text-muted-foreground" />Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})
                  </Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
                    value={inputs.weight} onChange={e => onInput('weight', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && validateWeight() && onStep(3)}
                    className={iCls(errors.weight)} min="0" step="0.1" autoFocus />

                  {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onStep(1)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => validateWeight() && onStep(3)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding Step 3: Height ── */}
          {step === 3 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Ruler className="w-6 h-6 text-primary" /></div>
                <CardTitle className="text-2xl font-bold">How tall are you?</CardTitle>
                <CardDescription className="text-sm mt-1">Combined with your weight to calculate BMI.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Ruler className="w-4 h-4 text-muted-foreground" />Height ({unitSystem === 'metric' ? 'cm' : 'ft / in'})
                  </Label>
                  {unitSystem === 'metric' ? (
                    <Input type="number" inputMode="decimal" placeholder="e.g. 175"
                      value={inputs.height} onChange={e => onInput('height', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && validateHeight() && onStep(4)}
                      className={iCls(errors.height)} min="0" step="0.1" autoFocus />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input type="number" inputMode="numeric" placeholder="Feet"
                          value={inputs.heightFt} onChange={e => onInput('heightFt', e.target.value)}
                          className={iCls(errors.height)} min="0" autoFocus />
                        <span className="text-xs text-muted-foreground mt-1 block">Feet</span>
                      </div>
                      <div>
                        <Input type="number" inputMode="numeric" placeholder="Inches"
                          value={inputs.heightIn} onChange={e => onInput('heightIn', e.target.value)}
                          className={iCls(errors.height)} min="0" max="11" />
                        <span className="text-xs text-muted-foreground mt-1 block">Inches</span>
                      </div>
                    </div>
                  )}
                  {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onStep(2)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => validateHeight() && onStep(4)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding Step 4: Age + Sex ── */}
          {step === 4 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg></div>
                <CardTitle className="text-2xl font-bold">A bit about you</CardTitle>
                <CardDescription className="text-sm mt-1">Used to calculate BMR and TDEE — your daily calorie needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    Age
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">needed for BMR & TDEE</span>
                  </Label>
                  <Input type="number" inputMode="numeric" placeholder="e.g. 28"
                    value={inputs.age} onChange={e => onInput('age', e.target.value)}
                    className={iCls(errors.age)} min="1" max="120" autoFocus />
                  {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
                  <p className="text-xs text-muted-foreground">Optional — skip to calculate BMI only</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Biological sex</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as Sex[]).map(s => (
                      <button key={s} onClick={() => onInput('sex', s)}
                        className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all ${
                          inputs.sex === s ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-border/80 hover:bg-secondary/30'
                        }`}>
                        {s === 'male' ? '♂ Male' : '♀ Female'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Used for body fat calculation</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onStep(3)} style={{ minHeight: '52px' }}

                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => { if (validateAboutYou()) onStep(5) }} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding Step 5: Activity ── */}
          {step === 5 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-primary" /></div>
                <CardTitle className="text-2xl font-bold">How active are you?</CardTitle>
                <CardDescription className="text-sm mt-1">Used to calculate total daily calorie needs (TDEE).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.value} onClick={() => onActivity(a.value)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                      activityLevel === a.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-secondary/30'
                    }`}>
                    <div>
                      <p className="font-semibold text-sm">{a.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activityLevel === a.value ? 'border-primary' : 'border-muted-foreground/30'}`}>
                      {activityLevel === a.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => onStep(4)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => onStep(6)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">
                    Next — Body Measurements <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Onboarding Step 6: Body Measurements (optional) ── */}
          {step === 6 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Percent className="w-6 h-6 text-primary" /></div>
                <CardTitle className="text-2xl font-bold">Body measurements</CardTitle>
                <CardDescription className="text-sm mt-1">Optional — unlocks Body Fat % calculation. Skip if you don't have a tape measure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2.5">
                  All in <strong>{mUnit}</strong>. Measure at the narrowest point with a soft tape measure.
                </p>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Neck circumference ({mUnit})</Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={unitSystem === 'metric' ? 'e.g. 37' : 'e.g. 14.5'}
                    value={neck} onChange={e => onNeck(e.target.value)}
                    className={iCls(errors.neck)} min="0" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Waist circumference ({mUnit})</Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={unitSystem === 'metric' ? 'e.g. 80' : 'e.g. 32'}
                    value={waist} onChange={e => onWaist(e.target.value)}
                    className={iCls(errors.waist)} min="0" step="0.1" />
                </div>
                {inputs.sex === 'female' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hip circumference ({mUnit})</Label>
                    <Input type="number" inputMode="decimal"
                      placeholder={unitSystem === 'metric' ? 'e.g. 95' : 'e.g. 37'}
                      value={hip} onChange={e => onHip(e.target.value)}
                      className={iCls(errors.hip)} min="0" step="0.1" />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => onStep(5)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => onComplete(false)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">
                    See my results <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => onComplete(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 underline underline-offset-2">
                  Skip body measurements
                </button>
              </CardContent>
            </Card>
          )}
        </>

      )}

      {/* ════════════════════════ CHECK-IN STEPS ════════════════════════ */}
      {mode === 'checkin' && (
        <>
          {/* ── Check-in Step 1: Weight ── */}
          {step === 1 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Today's check-in</CardTitle>
                <CardDescription>Log your current weight to track progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {profile && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{profile.sex === 'male' ? 'M' : 'F'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex-1">
                      <span className="font-semibold text-foreground">
                        {profile.unitSystem === 'imperial' ? `${profile.heightFt}'${profile.heightIn}"` : `${profile.height} cm`}
                      </span>
                      {profile.age && <span> · {profile.age}y</span>}
                      <span> · {profile.sex}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">from profile</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    Weight ({profile?.unitSystem === 'metric' ? 'kg' : 'lbs'})
                  </Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={profile?.unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
                    value={inputs.weight} onChange={e => onInput('weight', e.target.value)}
                    className={`h-12 text-base ${errors.weight ? 'border-destructive' : ''}`}
                    min="0" step="0.1" autoFocus />
                  {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                </div>
                {/* Primary: Save & done. Secondary: update activity/body */}
                <div className="space-y-2">
                  <button onClick={() => {
                    const e: Record<string,string> = {}
                    if (!parseFloat(inputs.weight) || parseFloat(inputs.weight) <= 0) e.weight = 'Enter a valid weight'
                    onSetErrors(e)
                    if (!Object.keys(e).length) onComplete(true)
                  }} style={{ minHeight: '56px' }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-base font-semibold transition-all hover:bg-primary/90 shadow-md shadow-primary/20">
                    <CheckCircle2 className="w-5 h-5" /> Save check-in
                  </button>
                  <div className="flex gap-2">
                    {onCancel && (
                      <button onClick={onCancel} style={{ minHeight: '44px' }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary text-muted-foreground">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    )}
                    <button onClick={() => {
                      const e: Record<string,string> = {}
                      if (!parseFloat(inputs.weight) || parseFloat(inputs.weight) <= 0) e.weight = 'Enter a valid weight'
                      onSetErrors(e)
                      if (!Object.keys(e).length) onStep(2)
                    }} style={{ minHeight: '44px' }}
                      className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                      Also update activity / body <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Check-in Step 2: Activity ── */}
          {step === 2 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Activity className="w-5 h-5" />Activity level</CardTitle>
                <CardDescription>Update if it's changed since last time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.value} onClick={() => onActivity(a.value)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                      activityLevel === a.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-secondary/30'
                    }`}>
                    <div>
                      <p className="font-semibold text-sm">{a.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activityLevel === a.value ? 'border-primary' : 'border-muted-foreground/30'}`}>
                      {activityLevel === a.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => onStep(1)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button onClick={() => onStep(3)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">
                    Next — Body Measurements <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Check-in Step 3: Body ── */}
          {step === 3 && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Percent className="w-5 h-5" />Body measurements</CardTitle>
                <CardDescription>Optional — skip if you don't have a tape measure handy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2.5">
                  All in <strong>{mUnit}</strong>. Measure at the narrowest point.
                </p>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Neck ({mUnit})</Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={unitSystem === 'metric' ? 'e.g. 37' : 'e.g. 14.5'}
                    value={neck} onChange={e => onNeck(e.target.value)}
                    className={iCls(errors.neck)} min="0" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Waist ({mUnit})</Label>
                  <Input type="number" inputMode="decimal"
                    placeholder={unitSystem === 'metric' ? 'e.g. 80' : 'e.g. 32'}
                    value={waist} onChange={e => onWaist(e.target.value)}
                    className={iCls(errors.waist)} min="0" step="0.1" />
                </div>
                {(inputs.sex === 'female' || profile?.sex === 'female') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hip ({mUnit})</Label>
                    <Input type="number" inputMode="decimal"
                      placeholder={unitSystem === 'metric' ? 'e.g. 95' : 'e.g. 37'}
                      value={hip} onChange={e => onHip(e.target.value)}
                      className={iCls(errors.hip)} min="0" step="0.1" />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => onStep(2)} style={{ minHeight: '52px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => onComplete(false)} style={{ minHeight: '52px' }}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">
                    Save check-in <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => onComplete(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 underline underline-offset-2">
                  Skip body measurements
                </button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ─── Results Payoff Screen ─────────────────────────────────────────────────
// ─── Home Page ─────────────────────────────────────────────────────────────
function HomePage({ dashboard, unitSystem, checkIns, profile, onNewCheckin, onOpenDashboard, onViewProgress, onEditProfile, aiPlan, user, onAiPlan, onViewPlan }: {
  dashboard: Dashboard; unitSystem: UnitSystem
  checkIns: CheckIn[]; profile: UserProfile | null
  onNewCheckin: () => void; onOpenDashboard: () => void
  onViewProgress: () => void; onEditProfile: () => void
  aiPlan: AIPlan | null; user: User | null; onAiPlan: () => void; onViewPlan: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const name = profile?.name && profile.name !== 'there' ? profile.name : null

  // Time-aware greeting
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Did user check in today?
  const todayStr = new Date().toDateString()
  const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null
  const checkedInToday = lastCheckIn ? new Date(lastCheckIn.date).toDateString() === todayStr : false

  // Weight trend — last 6 check-ins
  const trendData = checkIns.slice(-6).map(c => ({
    date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: parseFloat(c.inputs.weight) || null,
    bmi: c.dashboard.bmi?.bmi ?? null,
  }))

  // Weight change since last two check-ins
  const wDelta = checkIns.length >= 2
    ? parseFloat(checkIns[checkIns.length-1].inputs.weight) - parseFloat(checkIns[checkIns.length-2].inputs.weight)
    : null
  const bmiDelta = checkIns.length >= 2 && checkIns[checkIns.length-1].dashboard.bmi && checkIns[checkIns.length-2].dashboard.bmi
    ? checkIns[checkIns.length-1].dashboard.bmi!.bmi - checkIns[checkIns.length-2].dashboard.bmi!.bmi
    : null

  const metrics = [
    { label: 'BMI', value: dashboard.bmi ? `${dashboard.bmi.bmi}` : '—', sub: dashboard.bmi?.label ?? '', color: dashboard.bmi?.color },
    { label: 'BMR', value: dashboard.bmr ? `${dashboard.bmr.bmr.toLocaleString()}` : '—', sub: dashboard.bmr ? 'kcal' : 'needs age', color: 'hsl(200 80% 55%)' },
    { label: 'TDEE', value: dashboard.tdee ? `${dashboard.tdee.tdee.toLocaleString()}` : '—', sub: dashboard.tdee ? 'kcal' : 'needs age', color: 'hsl(35 95% 55%)' },
    { label: 'Body Fat', value: dashboard.bodyFat ? `${dashboard.bodyFat.bodyFat}%` : '—', sub: dashboard.bodyFat?.category ?? 'skipped', color: dashboard.bodyFat?.color },
  ]

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Greeting + status ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{timeGreeting}{name ? `, ${name}` : ''}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {checkedInToday
              ? `Checked in · ${new Date(lastCheckIn!.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
              : checkIns.length > 0
                ? `Last checked in · ${new Date(lastCheckIn!.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                : 'No check-ins yet'}
          </p>

        </div>
        <button onClick={onEditProfile}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary underline underline-offset-2 flex-shrink-0 mt-1">
          Edit profile
        </button>
      </div>

      {/* ── Check-in CTA — only if not checked in today ── */}
      {!checkedInToday && (
        <button onClick={onNewCheckin}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all group shadow-md shadow-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Log today's check-in</p>
              <p className="text-xs text-primary-foreground/70">
                {checkIns.length === 0 ? 'Start tracking your progress' : `${checkIns.length} check-in${checkIns.length !== 1 ? 's' : ''} tracked so far`}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* ── Checked in today banner ── */}
      {checkedInToday && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-400">Checked in today</p>
            <p className="text-xs text-muted-foreground">
              {lastCheckIn?.inputs.weight} {wUnit}
              {wDelta !== null && (
                <span className={`ml-2 font-medium ${wDelta < 0 ? 'text-green-400' : wDelta > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                  {wDelta > 0 ? '+' : ''}{wDelta.toFixed(1)} {wUnit} since last
                </span>
              )}
            </p>
          </div>
          <button onClick={onNewCheckin}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            Update
          </button>
        </div>
      )}

      {/* ── BMI mini-hero + metric cards ── */}
      {dashboard.bmi && (
        <div className="space-y-3">
          {/* BMI hero row */}
          <div className="rounded-2xl border p-5 flex items-center gap-5"
            style={{ borderColor: dashboard.bmi.color + '40', background: `linear-gradient(135deg, ${dashboard.bmi.color}15 0%, ${dashboard.bmi.color}05 100%)` }}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Body Mass Index</p>
              <p className="text-6xl font-black tracking-tight leading-none" style={{ color: dashboard.bmi.color }}>{dashboard.bmi.bmi}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: dashboard.bmi.color, borderColor: dashboard.bmi.color + '50', background: dashboard.bmi.color + '15' }}>{dashboard.bmi.label}</span>
                {bmiDelta !== null && (
                  <span className={`text-xs font-medium ${bmiDelta < 0 ? 'text-primary' : bmiDelta > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    {bmiDelta > 0 ? '↑' : bmiDelta < 0 ? '↓' : '→'} {Math.abs(bmiDelta).toFixed(1)} since last
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Healthy weight</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{dashboard.bmi.idealWeightMin}–{dashboard.bmi.idealWeightMax}</p>
              <p className="text-[10px] text-muted-foreground">{wUnit}</p>
            </div>
          </div>
          {/* Supporting metrics */}
          <div className="grid grid-cols-3 gap-3">
            {metrics.slice(1).map(m => (
              <div key={m.label} className="rounded-xl border border-border/50 p-3 text-center bg-card">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{m.label}</p>
                <p className="text-xl font-black leading-none" style={{ color: m.color ?? 'inherit' }}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 capitalize">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      {checkIns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black text-primary">{checkIns.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Check-ins</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black text-foreground">
              {Math.floor((Date.now() - new Date(checkIns[0].date).getTime()) / 86400000)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Days tracking</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black" style={{ color: wDelta !== null && wDelta < 0 ? 'hsl(var(--primary))' : wDelta !== null && wDelta > 0 ? 'hsl(35 95% 55%)' : 'hsl(var(--muted-foreground))' }}>
              {wDelta !== null ? `${wDelta > 0 ? '+' : ''}${wDelta.toFixed(1)}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{wUnit} change</p>
          </div>
        </div>
      )}

      {/* ── Weight trend sparkline ── */}
      {trendData.length >= 2 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold">Weight trend</p>
              <p className="text-[10px] text-muted-foreground">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={onViewProgress}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              Full history <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-xl text-xs">
                    <p className="text-muted-foreground">{payload[0]?.payload?.date}</p>
                    <p className="font-semibold text-primary">{payload[0]?.value} {wUnit}</p>
                  </div>
                )
              }} />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Quick insights ── */}
      {dashboard.bmi && (() => {
        const b = dashboard.bmi!
        type Insight = { icon: React.ReactNode; text: string; color: string; tag?: string }
        const insights: Insight[] = []
        const iconCls = 'w-4 h-4 flex-shrink-0 mt-0.5'

        // ─ BMI insight
        if (b.category === 'obese' || b.category === 'overweight') {
          insights.push({ icon: <Target className={`${iconCls} text-orange-400`} />, text: `Your goal weight is ${b.idealWeightMax} ${wUnit}. A 500 kcal/day deficit gets you there.`, color: 'text-orange-400' })
        } else if (b.category === 'normal') {
          insights.push({ icon: <CheckCircle2 className={`${iconCls} text-primary`} />, text: `Your BMI is in the healthy range. Focus on maintaining with consistent check-ins.`, color: 'text-primary' })
        } else if (b.category === 'underweight') {
          insights.push({ icon: <Zap className={`${iconCls} text-blue-400`} />, text: `You're below healthy weight. Consider a calorie surplus to reach ${b.idealWeightMin} ${wUnit}.`, color: 'text-blue-400' })
        }

        // ─ TDEE / calorie insight
        if (dashboard.tdee) {
          const t = dashboard.tdee
          if (b.category === 'obese' || b.category === 'overweight') {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Eating ${t.deficit.toLocaleString()} kcal/day creates a 500 kcal deficit — the sweet spot for fat loss.`, color: 'text-yellow-400' })
          } else if (b.category === 'underweight') {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Eating ${t.surplus.toLocaleString()} kcal/day gives you a 300 kcal surplus to gain healthy weight.`, color: 'text-yellow-400' })
          } else {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Staying within 100–200 kcal of this helps you maintain your weight.`, color: 'text-yellow-400' })
          }
        }

        // ─ Body fat insight
        if (dashboard.bodyFat) {
          const bf = dashboard.bodyFat
          if (bf.category === 'Obese') {
            insights.push({ icon: <Activity className={`${iconCls} text-red-400`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). Combining cardio with strength training accelerates fat loss while preserving muscle.`, color: 'text-red-400' })
          } else if (bf.category === 'Average') {
            insights.push({ icon: <Activity className={`${iconCls} text-orange-400`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). You have ${bf.leanMass} ${wUnit} of lean mass — protect it with adequate protein intake.`, color: 'text-orange-400' })
          } else if (bf.category === 'Athletic' || bf.category === 'Fitness') {
            insights.push({ icon: <Activity className={`${iconCls} text-primary`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). Great body composition — ${bf.leanMass} ${wUnit} lean mass. Focus on strength to maintain it.`, color: 'text-primary' })
          }
        }

        // ─ BMR insight
        if (dashboard.bmr) {
          insights.push({ icon: <Zap className={`${iconCls} text-blue-400`} />, text: `Your body burns ${dashboard.bmr.bmr.toLocaleString()} kcal at complete rest. Building muscle increases this number over time.`, color: 'text-blue-400' })
        }

        // ─ Weight trend insight (signed in users with 2+ check-ins)
        if (user && checkIns.length >= 2) {
          const first = parseFloat(checkIns[0].inputs.weight)
          const last = parseFloat(checkIns[checkIns.length - 1].inputs.weight)
          const diff = last - first
          const weeks = Math.max(1, Math.round((new Date(checkIns[checkIns.length-1].date).getTime() - new Date(checkIns[0].date).getTime()) / (1000*60*60*24*7)))
          if (Math.abs(diff) > 0.5) {
            const perWeek = Math.abs(diff / weeks).toFixed(1)
            if (diff > 0) {
              insights.push({ icon: <TrendingUp className={`${iconCls} text-orange-400`} />, text: `You've gained ${Math.abs(diff).toFixed(1)} ${wUnit} over ${weeks} week${weeks > 1 ? 's' : ''} (~${perWeek} ${wUnit}/week). ${b.category === 'underweight' ? 'Great progress!' : 'Consider reviewing your calorie intake.'}`, color: 'text-orange-400' })
            } else {
              insights.push({ icon: <TrendingUp className={`${iconCls} text-primary`} />, text: `You've lost ${Math.abs(diff).toFixed(1)} ${wUnit} over ${weeks} week${weeks > 1 ? 's' : ''} (~${perWeek} ${wUnit}/week). ${(diff/weeks) < -1 ? 'Good pace — sustainable loss is 0.5–1 ×/week.' : 'Excellent sustainable pace!'}`, color: 'text-primary' })
            }
          }
        }

        // ─ Consistency nudge
        if (checkIns.length === 1) {
          insights.push({ icon: <TrendingUp className={`${iconCls} text-muted-foreground`} />, text: `Log your second check-in to start seeing your progress trend.`, color: 'text-muted-foreground' })
        } else if (user && checkIns.length >= 2) {
          const daysSince = Math.floor((Date.now() - new Date(checkIns[checkIns.length-1].date).getTime()) / (1000*60*60*24))
          if (daysSince >= 7) {
            insights.push({ icon: <CheckCircle2 className={`${iconCls} text-muted-foreground`} />, text: `It's been ${daysSince} days since your last check-in. Regular check-ins give you more accurate trend data.`, color: 'text-muted-foreground' })
          }
        }

        // ─ AI suggestions (signed in only)
        type AISuggestion = { text: string }
        const aiSuggestions: AISuggestion[] = []
        if (user && dashboard.bmi) {
          if (b.category === 'obese' || b.category === 'overweight') {
            aiSuggestions.push({ text: 'Start with a 10-minute walk after each meal — it reduces blood sugar spikes and burns an extra 100–150 kcal/day.' })
            aiSuggestions.push({ text: 'Swap liquid calories (soda, juice, alcohol) for water. This single change often eliminates 200–500 kcal/day.' })
            if (dashboard.bodyFat && dashboard.bodyFat.bodyFat > 25) {
              aiSuggestions.push({ text: 'Prioritize protein at every meal (chicken, eggs, legumes). It keeps you fuller longer and preserves lean mass during weight loss.' })
            }
          } else if (b.category === 'normal') {
            aiSuggestions.push({ text: 'You\'re in a great spot. Focus on body recomposition — strength training 3x/week will improve how you look and feel even at the same weight.' })
            aiSuggestions.push({ text: 'Track your protein intake for a week. Most people eating well still undereat protein, which affects energy and muscle maintenance.' })
          } else if (b.category === 'underweight') {
            aiSuggestions.push({ text: 'Add calorie-dense foods to every meal — nuts, avocado, olive oil. They add calories without making you feel overly full.' })
            aiSuggestions.push({ text: 'Resistance training 3x/week helps convert your calorie surplus into muscle rather than fat.' })
          }
          if (dashboard.bmr && dashboard.tdee) {
            const ratio = dashboard.tdee.tdee / dashboard.bmr.bmr
            if (ratio < 1.4) {
              aiSuggestions.push({ text: 'Your activity level appears sedentary. Adding even light daily movement (walks, standing) significantly improves metabolic health.' })
            }
          }
        }

        if (insights.length === 0) return null
        return (
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Smart Insights</p>
            <div className="space-y-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3">
                  {ins.icon}
                  <p className={`text-xs leading-relaxed ${ins.color}`}>{ins.text}</p>
                </div>
              ))}
            </div>
            {user && aiSuggestions.length > 0 && (
              <>
                <div className="h-px bg-border/50" />
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />AI Suggestions
                  </p>
                  <div className="space-y-2">
                    {aiSuggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                        <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-foreground/80">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!user && (
              <div className="flex items-center gap-2 pt-1">
                <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <p className="text-xs text-muted-foreground">Sign in to unlock AI Suggestions personalized to your data</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── No data state ── */}
      {!dashboard.bmi && checkIns.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <BarChart2 className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Nothing here yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Your metrics will appear here after your first check-in.</p>
          </div>
        </div>
      )}

      {/* ── AI Health Plan button ── */}
      {checkIns.length > 0 && (
        <button onClick={aiPlan ? onViewPlan : onAiPlan}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all group shadow-sm overflow-hidden relative
            ${!aiPlan && user ? 'ai-plan-btn' : ''}
            ${aiPlan
              ? 'border-border/60 bg-card hover:border-border hover:bg-secondary/50'
              : user
              ? 'border-primary/40 bg-primary/5'
              : 'border-border/40 bg-card hover:bg-secondary/30'
            }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${aiPlan ? 'bg-secondary' : 'bg-primary/10'}`}>
              {user ? (
                <Sparkles className={`w-4 h-4 ${aiPlan ? 'text-muted-foreground' : 'text-primary'}`} />
              ) : (
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              )}
            </div>
            <div className="text-left">
              {aiPlan ? (
                <>
                  <p className="text-sm font-semibold">Your AI Health Plan</p>
                  <p className="text-xs text-muted-foreground">Diet · Exercise · Timeline · {aiPlan.goalLabel}</p>
                </>
              ) : user ? (
                <>
                  <p className="text-sm font-semibold text-primary">Generate your AI Health Plan</p>
                  <p className="text-xs text-muted-foreground">Personalized diet & exercise based on your stats</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">AI Health Plan</p>
                  <p className="text-xs text-muted-foreground">Sign in to unlock your personalized plan</p>
                </>
              )}
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all group-hover:translate-x-0.5 ${aiPlan ? 'text-muted-foreground' : 'text-primary/60 group-hover:text-primary'}`} />
        </button>
      )}

      {/* ── View Dashboard link ── */}
      {dashboard.bmi && (
        <button onClick={onOpenDashboard}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group shadow-sm overflow-hidden relative">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
          <div className="flex items-center gap-3 ml-2">
            <BarChart2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">View Full Dashboard</p>
              <p className="text-xs text-muted-foreground">AI plan · PDF report · all metrics</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* Trust strip — mobile only */}
      <div className="sm:hidden flex items-center justify-center gap-5 py-3 border-t border-border/30">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Local only</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />No account</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Free</span>
      </div>
    </div>
  )
}



// ─── Progress Page ──────────────────────────────────────────────────────────

// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// ─── Dashboard Page (inline full-page view) ────────────────────────────────

// ─── Account Page ────────────────────────────────────────────────────────────
// AccountPage, AuthPage imported from @/components/


// ─── Welcome Animation ────────────────────────────────────────────────────────
// ─── Main App ─────────────────────────────────────────────────────────────────
// ─── Auth Page ──────────────────────────────────────────────────────────────

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
      saveCheckIn(newCheckIn)
      setCheckIns(loadCheckIns())
      if (user) saveCheckInToCloud(user.uid, newCheckIn)
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
      saveCheckIn(newCheckIn)
      setCheckIns(loadCheckIns())
      if (user) {
        // Ensure profile exists in Supabase before saving check-in
        upsertProfile(user.uid, {
          email: user.email,
          name: profile.name,
          unit_system: profile.unitSystem,
          height: profile.height,
          height_ft: profile.heightFt,
          height_in: profile.heightIn,
          age: profile.age,
          sex: profile.sex,
        }).then(() => saveCheckInToCloud(user.uid, newCheckIn))
      }
    }

    showToast('Check-in saved!')
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
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
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

      <main className="flex-1 py-6 sm:py-12 mobile-page-padding">
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
      <nav className={`bottom-tab-bar transition-transform duration-300 ${(page === 'onboarding' || page === 'results') ? 'translate-y-full pointer-events-none' : ''}`}>
        {/* Home */}
        <button onClick={() => setPage('home')} className={`bottom-tab-item relative ${page === 'home' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Home">
          {page === 'home' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        {/* Progress */}
        <button onClick={() => user ? setPage('progress') : goToAuth('signin')} className={`bottom-tab-item relative ${page === 'progress' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Progress">
          {page === 'progress' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="relative">
            <TrendingUp className="w-4 h-4" />
            {checkIns.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
          </div>
          <span className="text-[10px] font-medium">Progress</span>
        </button>
        {/* Check-in — center, pill CTA */}
        <button onClick={handleNewCheckin} className={`bottom-tab-item relative ${page === 'checkin' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="New Check-in">
          {page === 'checkin' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-medium">Check-in</span>
        </button>
        {/* Dashboard */}
        <button onClick={() => setPage('dashboard')} className={`bottom-tab-item relative ${page === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Dashboard">
          {page === 'dashboard' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <div className="relative">
            <BarChart2 className="w-4 h-4" />
            {dashboardCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
          </div>
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        {/* Account */}
        <button onClick={() => setPage('account')} className={`bottom-tab-item relative ${page === 'account' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Account">
          {page === 'account' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

