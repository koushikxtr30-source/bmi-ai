import { useState, useCallback, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'
import {
  Calculator, Info, Moon, Sun, Scale, Ruler, Activity,
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

const STORAGE_KEY = 'mybmi_checkins'

function loadCheckIns(): CheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCheckIn(c: CheckIn): void {
  try {
    const existing = loadCheckIns()
    existing.push(c)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {}
}

function deleteCheckIns(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── User Profile & Storage ───────────────────────────────────────────────────
interface UserProfile {
  name: string
  height: string
  heightFt: string
  heightIn: string
  age: string
  sex: Sex
  unitSystem: UnitSystem
  createdAt: string
}

const PROFILE_KEY = 'mybmi_profile'

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveProfile(p: UserProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch {}
}

function deleteProfile(): void {
  try { localStorage.removeItem(PROFILE_KEY) } catch {}
}

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

// ─── Rule-Based AI Plan Engine ────────────────────────────────────────────────
function generateAIPlan(dashboard: Dashboard, inputs: SharedInputs, unitSystem: UnitSystem, activityLevel: ActivityLevel): AIPlan {
  const bmi = dashboard.bmi?.bmi ?? 22
  const category = dashboard.bmi?.category ?? 'normal'
  const tdee = dashboard.tdee?.tdee ?? dashboard.bmr?.bmr ?? 2000
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const age = parseInt(inputs.age) || 30
  const sex = inputs.sex

  // ── Determine goal ──
  const goal: 'lose' | 'maintain' | 'gain' =
    category === 'underweight' ? 'gain' :
    category === 'normal' ? 'maintain' : 'lose'

  const goalLabel = goal === 'lose' ? 'Lose Weight' : goal === 'gain' ? 'Gain Weight' : 'Maintain & Tone'

  const summary = goal === 'lose'
    ? `Based on your BMI of ${bmi}, a gradual calorie deficit with consistent exercise will help you reach a healthy weight. Aim for 0.5–1 ${wUnit}/week loss.`
    : goal === 'gain'
    ? `Your BMI of ${bmi} suggests you're underweight. A moderate calorie surplus with strength training will help you build healthy mass.`
    : `Your BMI of ${bmi} is in the healthy range. Focus on body composition, maintaining weight, and building fitness.`

  // ── Calorie targets ──
  const lossCals   = Math.round(tdee - 500)
  const maintainCals = tdee
  const gainCals   = Math.round(tdee + 300)
  const targetCals = goal === 'lose' ? lossCals : goal === 'gain' ? gainCals : maintainCals

  // ── Diet options ──
  const p = Math.round(targetCals * (goal === 'lose' ? 0.35 : goal === 'gain' ? 0.30 : 0.30) / 4)
  const c = Math.round(targetCals * (goal === 'lose' ? 0.35 : goal === 'gain' ? 0.45 : 0.40) / 4)
  const f = Math.round(targetCals * (goal === 'lose' ? 0.30 : goal === 'gain' ? 0.25 : 0.30) / 9)

  const dietOptions: DietOption[] = [
    {
      name: 'Mediterranean',
      emoji: '🫒',
      description: 'Heart-healthy, sustainable, rich in whole foods and healthy fats.',
      calories: targetCals,
      macros: { protein: p, carbs: Math.round(c * 1.1), fat: Math.round(f * 1.0) },
      foods: ['Olive oil', 'Fish & seafood', 'Legumes', 'Whole grains', 'Vegetables', 'Nuts & seeds', 'Greek yogurt'],
      avoid: ['Processed meats', 'Refined sugars', 'Highly processed foods'],
      tag: 'Most Sustainable'
    },
    {
      name: 'High Protein',
      emoji: '🥩',
      description: 'Preserves muscle during weight loss, increases satiety.',
      calories: targetCals,
      macros: { protein: Math.round(p * 1.4), carbs: Math.round(c * 0.8), fat: Math.round(f * 0.9) },
      foods: ['Chicken breast', 'Eggs', 'Greek yogurt', 'Cottage cheese', 'Lean beef', 'Tofu', 'Whey protein'],
      avoid: ['Sugary drinks', 'White bread', 'Fried foods'],
      tag: goal === 'lose' ? 'Best for Fat Loss' : 'Best for Muscle Gain'
    },
    {
      name: 'Low Carb',
      emoji: '🥗',
      description: 'Reduces insulin spikes, effective for fat loss and blood sugar.',
      calories: targetCals,
      macros: { protein: Math.round(p * 1.2), carbs: Math.round(c * 0.4), fat: Math.round(f * 1.5) },
      foods: ['Avocado', 'Eggs', 'Leafy greens', 'Nuts', 'Cheese', 'Fatty fish', 'Cauliflower rice'],
      avoid: ['Bread & pasta', 'Rice', 'Sugar', 'Starchy vegetables', 'Beer'],
      tag: 'Best for Quick Results'
    },
    {
      name: 'Plant-Based',
      emoji: '🌱',
      description: 'Fiber-rich, anti-inflammatory, environmentally conscious.',
      calories: targetCals,
      macros: { protein: Math.round(p * 0.9), carbs: Math.round(c * 1.2), fat: Math.round(f * 0.9) },
      foods: ['Lentils', 'Chickpeas', 'Tofu & tempeh', 'Quinoa', 'Nuts & seeds', 'Oats', 'Berries'],
      avoid: ['All animal products', 'Processed vegan junk food'],
      tag: 'Eco-Friendly'
    },
  ]

  // ── Exercise routine ──
  const isDeconditioned = category === 'obese' || activityLevel === 'sedentary'

  const exerciseRoutine: ExerciseDay[] = goal === 'lose' ? [
    { day: 'Monday',    type: 'Cardio',           intensity: isDeconditioned ? 'Low' : 'Moderate', duration: isDeconditioned ? '20 min' : '35 min', exercises: isDeconditioned ? ['Brisk walking', 'Seated marching', 'Light cycling'] : ['Brisk walking / jogging', 'Cycling or elliptical', 'Jump rope (modified)'], rest: false },
    { day: 'Tuesday',   type: 'Strength',         intensity: 'Moderate', duration: '30 min', exercises: ['Bodyweight squats 3×12', 'Push-ups (modified ok) 3×10', 'Dumbbell rows 3×12', 'Glute bridges 3×15'], rest: false },
    { day: 'Wednesday', type: 'Active Recovery',  intensity: 'Low',      duration: '20 min', exercises: ['Yoga or stretching', 'Light walk', 'Foam rolling'], rest: false },
    { day: 'Thursday',  type: 'Cardio + Core',    intensity: isDeconditioned ? 'Low' : 'Moderate', duration: isDeconditioned ? '25 min' : '40 min', exercises: isDeconditioned ? ['Walking', 'Seated ab crunches', 'Side bends'] : ['Treadmill intervals', 'Plank 3×30s', 'Bicycle crunches 3×15', 'Mountain climbers 3×20'], rest: false },
    { day: 'Friday',    type: 'Full Body Strength', intensity: 'Moderate', duration: '35 min', exercises: ['Lunges 3×12', 'Incline push-ups 3×10', 'Lat pulldown / band row 3×12', 'Shoulder press 3×12'], rest: false },
    { day: 'Saturday',  type: 'Fun Activity',     intensity: 'Moderate', duration: '45 min', exercises: ['Swimming', 'Hiking', 'Dance class', 'Sports — pick what you enjoy!'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',         intensity: '—',        duration: '—',      exercises: ['Full rest or gentle walk', 'Prep meals for the week'], rest: true },
  ] : goal === 'gain' ? [
    { day: 'Monday',    type: 'Upper Body Push',  intensity: 'High', duration: '45 min', exercises: ['Bench press 4×8', 'Overhead press 3×10', 'Incline dumbbell press 3×10', 'Tricep dips 3×12'], rest: false },
    { day: 'Tuesday',   type: 'Lower Body',       intensity: 'High', duration: '45 min', exercises: ['Squats 4×8', 'Romanian deadlift 3×10', 'Leg press 3×12', 'Calf raises 4×15'], rest: false },
    { day: 'Wednesday', type: 'Rest / Cardio',    intensity: 'Low',  duration: '20 min', exercises: ['Light walk', 'Stretching', 'Foam rolling'], rest: false },
    { day: 'Thursday',  type: 'Upper Body Pull',  intensity: 'High', duration: '45 min', exercises: ['Deadlift 4×5', 'Pull-ups or lat pulldown 4×8', 'Barbell rows 3×10', 'Bicep curls 3×12'], rest: false },
    { day: 'Friday',    type: 'Full Body',        intensity: 'Moderate', duration: '40 min', exercises: ['Power cleans 3×5', 'Dips 3×10', 'Bulgarian split squat 3×10', 'Face pulls 3×15'], rest: false },
    { day: 'Saturday',  type: 'Active Recovery',  intensity: 'Low', duration: '30 min', exercises: ['Light cardio', 'Mobility work', 'Yoga'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',         intensity: '—',   duration: '—',      exercises: ['Full rest', 'Eat in calorie surplus'], rest: true },
  ] : [
    { day: 'Monday',    type: 'Strength',         intensity: 'Moderate', duration: '40 min', exercises: ['Compound lifts: squat, bench, row', 'Progressive overload focus'], rest: false },
    { day: 'Tuesday',   type: 'Cardio',           intensity: 'Moderate', duration: '30 min', exercises: ['Running / cycling / rowing', 'Zone 2 heart rate (60–70% max)'], rest: false },
    { day: 'Wednesday', type: 'Strength',         intensity: 'Moderate', duration: '40 min', exercises: ['Deadlift, overhead press, pull-ups', 'Accessory work'], rest: false },
    { day: 'Thursday',  type: 'Active Recovery',  intensity: 'Low',      duration: '20 min', exercises: ['Yoga', 'Stretching', 'Light walk'], rest: false },
    { day: 'Friday',    type: 'Strength + HIIT',  intensity: 'High',     duration: '45 min', exercises: ['Full body strength circuit', '10 min HIIT finisher'], rest: false },
    { day: 'Saturday',  type: 'Outdoor / Sport',  intensity: 'Moderate', duration: '45 min', exercises: ['Hiking', 'Cycling', 'Sport of choice'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',         intensity: '—',        duration: '—',      exercises: ['Full rest', 'Meal prep'], rest: true },
  ]

  // ── Goal timeline ──
  const targetBMI = category === 'underweight' ? 20 : category === 'normal' ? bmi : 24
  const heightStr = inputs.height || '170'
  const heightFt = parseFloat(inputs.heightFt) || 5
  const heightInch = inputs.heightIn !== '' ? parseFloat(inputs.heightIn) : 7
  const heightM = unitSystem === 'metric'
    ? parseFloat(heightStr) / 100
    : ((heightFt * 12) + heightInch) * 0.0254
  const weightFactor = unitSystem === 'metric' ? 1 : 2.20462
  const targetWeightKg = targetBMI * heightM * heightM
  const targetWeight = Math.round(targetWeightKg * weightFactor * 10) / 10
  const weightDiffKg = Math.abs(targetWeightKg - (parseFloat(inputs.weight) || 70) / (unitSystem === 'imperial' ? 2.20462 : 1))
  const weeklyChangeKg = goal === 'maintain' ? 0 : goal === 'lose' ? 0.5 : 0.25
  const weeksToGoal = goal === 'maintain' ? 0 : Math.ceil(weightDiffKg / weeklyChangeKg)
  const weeklyChange = Math.round(weeklyChangeKg * weightFactor * 10) / 10

  const milestones: Milestone[] = goal === 'maintain' ? [
    { week: 2,  label: '🏁 Start',        target: 'Establish baseline',  action: 'Log your weight daily for 2 weeks' },
    { week: 6,  label: '💪 Habit Lock-in', target: 'Exercise 3×/week',   action: 'Schedule workouts, treat them as appointments' },
    { week: 12, label: '🎯 Body Recomp',   target: 'Reduce body fat %',  action: 'Prioritize protein & strength training' },
  ] : [
    { week: 2,  label: '🏁 Week 2',  target: `Lose ${(weeklyChange * 2).toFixed(1)} ${wUnit}`, action: 'Set up your meal plan and exercise schedule' },
    { week: Math.round(weeksToGoal * 0.25), label: '⚡ 25% Progress', target: `${(Math.round(weightDiffKg * 0.25 * weightFactor * 10)/10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Review and adjust plan if progress stalls' },
    { week: Math.round(weeksToGoal * 0.5),  label: '🔥 Halfway',     target: `${(Math.round(weightDiffKg * 0.5  * weightFactor * 10)/10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Take progress photos, reassess macros' },
    { week: Math.round(weeksToGoal * 0.75), label: '🌟 75% There',   target: `${(Math.round(weightDiffKg * 0.75 * weightFactor * 10)/10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Stay consistent, plan maintenance phase' },
    { week: weeksToGoal, label: '🏆 Goal!', target: `Reach ${targetWeight} ${wUnit}`, action: 'Transition to maintenance plan' },
  ]

  // ── Daily habits ──
  const habits = [
    goal === 'lose' ? '🥤 Drink 2–3L water daily — reduces hunger and boosts metabolism' : '🥤 Drink 2.5–3L water daily to support muscle protein synthesis',
    '😴 Sleep 7–9 hours — poor sleep increases cortisol and hunger hormones',
    goal === 'lose' ? '🍽️ Eat slowly and stop at 80% full (hara hachi bu)' : '🍽️ Eat 4–5 smaller meals spread throughout the day',
    '🚶 Add 7,000–10,000 steps daily — even without gym sessions',
    goal === 'lose' ? '📊 Track food for at least 4 weeks to build macro awareness' : '📊 Track protein intake — aim for 1.6–2.2g per kg of bodyweight',
    sex === 'male' ? '🧘 Manage stress — high cortisol increases belly fat storage' : '🧘 Manage stress — cortisol can cause weight fluctuations and cravings',
    age >= 50 ? '🦴 Prioritize weight-bearing exercise to maintain bone density' : '⏱️ Avoid sitting for more than 60 min — set a movement reminder',
    '🌅 Eat most of your calories earlier in the day for better metabolic function',
  ]

  return {
    goal, goalLabel, summary, dietOptions, exerciseRoutine,
    timeline: { currentBMI: bmi, targetBMI, targetWeight, weeksToGoal, weeklyChange, milestones },
    habits,
    generatedBy: 'rule-based'
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-lg whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        {message}
      </div>
    </div>
  )
}

// ─── PWA Install Prompt ──────────────────────────────────────────────────
function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if already installed or previously dismissed
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
    if (outcome === 'dismissed') {
      sessionStorage.setItem('pwa-dismissed', '1')
    }
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
            <button
              onClick={handleInstall}
              className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Arc Gauge ────────────────────────────────────────────────────────────────
function ArcGauge({ value, min, max, color, segments }: {
  value: number; min: number; max: number; color: string
  segments: { from: number; to: number; color: string }[]
}) {
  const pct = (Math.min(Math.max(value, min), max) - min) / (max - min)
  const cx = 100, cy = 90, r = 70
  const toRad = (d: number) => d * Math.PI / 180
  const ax = (d: number) => cx + r * Math.cos(toRad(d))
  const ay = (d: number) => cy + r * Math.sin(toRad(d))
  const needleAngle = -180 + pct * 180
  // BMI boundary labels at 18.5, 25, 30 mapped to arc angle
  const bmiToAngle = (bmi: number) => -180 + ((bmi - min) / (max - min)) * 180
  const labelR = r + 14
  const lx = (d: number) => cx + labelR * Math.cos(toRad(d))
  const ly = (d: number) => cy + labelR * Math.sin(toRad(d))
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => (
        <path key={i}
          d={`M ${ax(seg.from)} ${ay(seg.from)} A ${r} ${r} 0 ${seg.to - seg.from > 180 ? 1 : 0} 1 ${ax(seg.to)} ${ay(seg.to)}`}
          fill="none" stroke={seg.color} strokeWidth="12" strokeLinecap="round" opacity="0.85"
        />
      ))}
      <line x1={cx} y1={cy} x2={cx + (r-10)*Math.cos(toRad(needleAngle))} y2={cy + (r-10)*Math.sin(toRad(needleAngle))} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {/* Boundary ticks + labels */}
      {([{bmi:18.5,label:'18.5'},{bmi:25,label:'25'},{bmi:30,label:'30'}] as {bmi:number;label:string}[]).map(({ bmi, label }) => {
        const a = bmiToAngle(bmi)
        const tx = cx + (r-6)*Math.cos(toRad(a)), ty = cy + (r-6)*Math.sin(toRad(a))
        const tx2 = cx + (r+2)*Math.cos(toRad(a)), ty2 = cy + (r+2)*Math.sin(toRad(a))
        return (
          <g key={bmi}>
            <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="rgba(150,150,150,0.6)" strokeWidth="1.5" />
            <text x={lx(a)} y={ly(a)} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="rgba(150,150,150,0.8)">{label}</text>
          </g>
        )
      })}
      {/* Category labels */}
      <text x={lx(bmiToAngle(14))} y={ly(bmiToAngle(14))+2} textAnchor="middle" fontSize="6" fill="hsl(200 80% 55%)" opacity="0.9">Under</text>
      <text x={lx(bmiToAngle(21.5))} y={ly(bmiToAngle(21.5))+2} textAnchor="middle" fontSize="6" fill="hsl(142 76% 45%)" opacity="0.9">Normal</text>
      <text x={lx(bmiToAngle(27.5))} y={ly(bmiToAngle(27.5))+2} textAnchor="middle" fontSize="6" fill="hsl(35 95% 55%)" opacity="0.9">Over</text>
      <text x={lx(bmiToAngle(35))} y={ly(bmiToAngle(35))+2} textAnchor="middle" fontSize="6" fill="hsl(0 84% 60%)" opacity="0.9">Obese</text>
    </svg>
  )
}

// ─── Shared Fields ────────────────────────────────────────────────────────────
function SharedFields({ inputs, errors, unitSystem, onChange }: {
  inputs: SharedInputs; errors: Record<string, string>; unitSystem: UnitSystem
  onChange: (f: keyof SharedInputs, v: string) => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  // h-12 = 48px touch target on mobile, text-base = 16px prevents iOS zoom
  const inputCls = (err?: string) => `h-12 text-base ${err ? 'border-destructive' : ''}`
  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Scale className="w-4 h-4 text-muted-foreground" />Weight ({wUnit})
        </Label>
        <Input type="number" inputMode="decimal"
          placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
          value={inputs.weight} onChange={e => onChange('weight', e.target.value)}
          className={inputCls(errors.weight)} min="0" step="0.1" />
        {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Ruler className="w-4 h-4 text-muted-foreground" />Height ({unitSystem === 'metric' ? 'cm' : 'ft / in'})
        </Label>
        {unitSystem === 'metric' ? (
          <Input type="number" inputMode="decimal" placeholder="e.g. 175"
            value={inputs.height} onChange={e => onChange('height', e.target.value)}
            className={inputCls(errors.height)} min="0" step="0.1" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input type="number" inputMode="numeric" placeholder="Feet"
                value={inputs.heightFt} onChange={e => onChange('heightFt', e.target.value)}
                className={inputCls(errors.height)} min="0" />
              <span className="text-xs text-muted-foreground mt-1 block">Feet</span>
            </div>
            <div>
              <Input type="number" inputMode="numeric" placeholder="Inches"
                value={inputs.heightIn} onChange={e => onChange('heightIn', e.target.value)}
                className={inputCls(errors.height)} min="0" max="11" />
              <span className="text-xs text-muted-foreground mt-1 block">Inches</span>
            </div>
          </div>
        )}
        {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
                    Age
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">needed for BMR & TDEE</span>
                  </Label>
          <Input type="number" inputMode="numeric" placeholder="e.g. 30"
            value={inputs.age} onChange={e => onChange('age', e.target.value)}
            className={inputCls(errors.age)} min="1" max="120" />
          {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sex</Label>
          <div className="flex gap-2 h-12 items-center">
            {(['male', 'female'] as Sex[]).map(s => (
              <button key={s} onClick={() => onChange('sex', s)}
                className={`flex-1 h-10 rounded-md text-sm border transition-colors capitalize touch-target ${
                  inputs.sex === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI Plan Section ──────────────────────────────────────────────────────────
function AIPlanSection({ plan, unitSystem }: { plan: AIPlan; unitSystem: UnitSystem }) {
  const [dietTab, setDietTab] = useState(0)
  const [openSection, setOpenSection] = useState<'diet' | 'exercise' | 'timeline' | 'habits' | null>('diet')
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const toggle = (s: typeof openSection) => setOpenSection(prev => prev === s ? null : s)

  const goalColor = plan.goal === 'lose' ? '#22c55e' : plan.goal === 'gain' ? '#a855f7' : '#3b82f6'
  const goalBg   = plan.goal === 'lose' ? 'rgba(34,197,94,0.08)' : plan.goal === 'gain' ? 'rgba(168,85,247,0.08)' : 'rgba(59,130,246,0.08)'

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Header */}
      <div className="rounded-xl border p-4" style={{ borderColor: goalColor + '44', background: goalBg }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: goalColor }} />
            <span className="text-sm font-semibold">AI Health Plan</span>
          </div>
          <Badge variant="outline" style={{ color: goalColor, borderColor: goalColor + '66' }}>
            {plan.goalLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>
        {plan.timeline.weeksToGoal > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.weeksToGoal}</p>
              <p className="text-[10px] text-muted-foreground">weeks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.weeklyChange}</p>
              <p className="text-[10px] text-muted-foreground">{wUnit}/week</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.targetWeight}</p>
              <p className="text-[10px] text-muted-foreground">target {wUnit}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Diet Plan ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('diet')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold">Diet Plan</span>
            <span className="text-xs text-muted-foreground">4 options</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'diet' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'diet' && (
          <div className="px-4 pb-4 space-y-3">
            {/* Diet tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {plan.dietOptions.map((d, i) => (
                <button key={i} onClick={() => setDietTab(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    dietTab === i ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'
                  }`}>
                  <span>{d.emoji}</span>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
            {/* Selected diet */}
            {(() => { const d = plan.dietOptions[dietTab]; return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{d.description}</p>
                  <Badge variant="secondary" className="ml-2 text-[10px] flex-shrink-0">{d.tag}</Badge>
                </div>
                {/* Calories + macros */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-secondary/50 rounded-lg p-2 text-center col-span-1">
                    <p className="text-[10px] text-muted-foreground">Calories</p>
                    <p className="text-sm font-bold text-orange-400">{d.calories.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Protein</p>
                    <p className="text-sm font-bold text-blue-400">{d.macros.protein}g</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Carbs</p>
                    <p className="text-sm font-bold text-yellow-400">{d.macros.carbs}g</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Fat</p>
                    <p className="text-sm font-bold text-purple-400">{d.macros.fat}g</p>
                  </div>
                </div>
                {/* Macro bar */}
                <div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-blue-400 rounded-l-full" style={{ width: `${Math.round(d.macros.protein*4/d.calories*100)}%` }} />
                    <div className="bg-yellow-400" style={{ width: `${Math.round(d.macros.carbs*4/d.calories*100)}%` }} />
                    <div className="bg-purple-400 rounded-r-full" style={{ width: `${Math.round(d.macros.fat*9/d.calories*100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Protein {Math.round(d.macros.protein*4/d.calories*100)}%</span>
                    <span>Carbs {Math.round(d.macros.carbs*4/d.calories*100)}%</span>
                    <span>Fat {Math.round(d.macros.fat*9/d.calories*100)}%</span>
                  </div>
                </div>
                {/* Foods */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-green-400 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Apple className="w-3 h-3" />Eat More</p>
                    <div className="space-y-1">
                      {d.foods.map(f => <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1"><span className="text-green-400">✓</span>{f}</p>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-red-400 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Leaf className="w-3 h-3" />Avoid</p>
                    <div className="space-y-1">
                      {d.avoid.map(f => <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1"><span className="text-red-400">✗</span>{f}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            )})()}
          </div>
        )}
      </div>

      {/* ── Exercise Routine ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('exercise')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Exercise Routine</span>
            <span className="text-xs text-muted-foreground">7-day schedule</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'exercise' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'exercise' && (
          <div className="px-4 pb-4 space-y-2">
            {plan.exerciseRoutine.map((day, i) => (
              <div key={i} className={`rounded-lg border p-3 ${day.rest ? 'border-border/30 opacity-60' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-12">{day.day.slice(0, 3).toUpperCase()}</span>
                    <span className="text-xs font-semibold">{day.type}</span>
                  </div>
                  {!day.rest && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{day.intensity}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{day.duration}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 ml-14">
                  {day.exercises.map((ex, j) => (
                    <p key={j} className="text-[11px] text-muted-foreground">{day.rest ? `💤 ${ex}` : `• ${ex}`}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Goal Timeline ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('timeline')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Goal Timeline</span>
            {plan.timeline.weeksToGoal > 0 && <span className="text-xs text-muted-foreground">{plan.timeline.weeksToGoal} weeks</span>}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'timeline' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'timeline' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Current BMI</p>
                <p className="text-base font-bold">{plan.timeline.currentBMI}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Target BMI</p>
                <p className="text-base font-bold text-green-400">{plan.timeline.targetBMI}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Target Weight</p>
                <p className="text-base font-bold">{plan.timeline.targetWeight} {wUnit}</p>
              </div>
            </div>
            <div className="space-y-2 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
              {plan.timeline.milestones.map((m, i) => (
                <div key={i} className="flex gap-3 items-start relative">
                  <div className="w-6 h-6 rounded-full border-2 border-border bg-card flex items-center justify-center flex-shrink-0 z-10">
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">Week {m.week}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.target}</p>
                    <p className="text-[11px] text-primary/70 mt-0.5">→ {m.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Habits ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('habits')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">Daily Habits</span>
            <span className="text-xs text-muted-foreground">{plan.habits.length} tips</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'habits' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'habits' && (
          <div className="px-4 pb-4 space-y-2">
            {plan.habits.map((h, i) => (
              <div key={i} className="flex gap-2 p-2 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">Generated by rule-based engine · AI-powered plans coming in Pro</p>
    </div>
  )
}

// ─── PDF Generator ─────────────────────────────���────────────────────────────
// Strip emojis and unsupported unicode — jsPDF Helvetica only handles latin chars
function clean(str: string): string {
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoji block
    .replace(/[\u{2600}-\u{26FF}]/gu, '')       // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')       // dingbats
    .replace(/\u2019/g, "'")                    // right single quote
    .replace(/\u2013/g, '-')                    // en dash
    .replace(/\u2014/g, '--')                   // em dash
    .replace(/\u2192/g, '->')                   // arrow right
    .replace(/[^\x00-\x7E\xA0-\xFF]/g, '')     // everything else non-latin
    .replace(/\s{2,}/g, ' ')                    // collapse double spaces from removed emojis
    .trim()
}

function generateHealthPDF(dashboard: Dashboard, aiPlan: AIPlan | null, unitSystem: UnitSystem, inputs: SharedInputs) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 18
  const col = margin
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── helpers ──
  let y = 0
  const nl = (n = 6) => { y += n }
  const checkPage = (needed = 20) => { if (y > 270 - needed) { doc.addPage(); y = 20 } }

  const h1 = (text: string, color: [number,number,number] = [15,15,15]) => {
    checkPage(14)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(clean(text), col, y); nl(10)
  }
  const h2 = (text: string) => {
    checkPage(12)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30,30,30)
    doc.text(clean(text), col, y); nl(7)
  }
  const h3 = (text: string, color: [number,number,number] = [80,80,80]) => {
    checkPage(9)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(clean(text).toUpperCase(), col, y); nl(5)
  }
  const body = (text: string, indent = 0) => {
    checkPage(7)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60,60,60)
    const lines = doc.splitTextToSize(clean(text), W - margin * 2 - indent)
    doc.text(lines, col + indent, y); nl(lines.length * 5)
  }
  const bullet = (text: string) => {
    checkPage(7)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60,60,60)
    const lines = doc.splitTextToSize(clean(text), W - margin * 2 - 5)
    doc.text('-', col + 1, y)
    doc.text(lines, col + 5, y); nl(lines.length * 4.8)
  }
  const divider = (color: [number,number,number] = [220,220,220]) => {
    checkPage(5)
    doc.setDrawColor(...color); doc.setLineWidth(0.3)
    doc.line(col, y, W - margin, y); nl(5)
  }
  const metricBox = (label: string, value: string, unit: string, x: number, boxW: number, color: [number,number,number]) => {
    doc.setFillColor(color[0], color[1], color[2]); doc.setDrawColor(...color)
    doc.roundedRect(x, y, boxW, 18, 2, 2, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80,80,80)
    doc.text(label, x + boxW/2, y + 5, { align: 'center' })
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(20,20,20)
    doc.text(value, x + boxW/2, y + 12, { align: 'center' })
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
    doc.text(unit, x + boxW/2, y + 17, { align: 'center' })
  }

  // ════════════════════════════════════════════════
  // COVER HEADER
  // ════════════════════════════════════════════════
  doc.setFillColor(12, 12, 14); doc.rect(0, 0, W, 42, 'F')
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255)
  doc.text('mybmi.ai', col, 18)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(160,160,170)
  doc.text('Personal Health Report', col, 26)
  doc.setFontSize(8); doc.setTextColor(120,120,130)
  doc.text(`Generated ${date}`, col, 33)
  if (inputs.age) {
    doc.text(`Age ${inputs.age}  |  ${inputs.sex === 'male' ? 'Male' : 'Female'}  |  ${inputs.weight} ${wUnit}`, W - margin, 33, { align: 'right' })
  }
  // green accent bar
  doc.setFillColor(34, 197, 94); doc.rect(0, 40, W, 2, 'F')
  y = 52

  // ════════════════════════════════════════════════
  // SECTION 1: METRICS
  // ════════════════════════════════════════════════
  h1('Health Metrics')
  divider()

  const bw = (W - margin * 2 - 9) / 4
  const bmiColor = dashboard.bmi?.category === 'normal' ? [220,252,231] as [number,number,number] :
                   dashboard.bmi?.category === 'underweight' ? [219,234,254] as [number,number,number] :
                   dashboard.bmi?.category === 'overweight'  ? [254,243,199] as [number,number,number] : [254,226,226] as [number,number,number]

  if (dashboard.bmi)   metricBox('BMI',       String(dashboard.bmi.bmi),               dashboard.bmi.label,         col,              bw, bmiColor)
  if (dashboard.bmr)   metricBox('BMR',       dashboard.bmr.bmr.toLocaleString(),       'kcal/day',                  col + bw + 3,     bw, [255,237,213])
  if (dashboard.tdee)  metricBox('TDEE',      dashboard.tdee.tdee.toLocaleString(),     'kcal/day',                  col + (bw+3)*2,   bw, [254,252,232])
  if (dashboard.bodyFat) metricBox('Body Fat', String(dashboard.bodyFat.bodyFat) + '%', dashboard.bodyFat.category,  col + (bw+3)*3,   bw, [243,232,255])
  nl(22)

  // Detail rows
  if (dashboard.bmi) {
    h3('BMI Analysis', [22, 101, 52])
    body(`Score: ${dashboard.bmi.bmi}  |  Category: ${dashboard.bmi.label}  |  Healthy weight for your height: ${dashboard.bmi.idealWeightMin}-${dashboard.bmi.idealWeightMax} ${wUnit}`)
    body(dashboard.bmi.tip)
    nl(2)
  }
  if (dashboard.tdee) {
    h3('Calorie Targets', [161, 98, 7])
    body(`Maintain weight: ${dashboard.tdee.tdee.toLocaleString()} kcal/day  |  Weight loss (-500): ${dashboard.tdee.deficit.toLocaleString()} kcal/day  |  Weight gain (+300): ${dashboard.tdee.surplus.toLocaleString()} kcal/day`)
    nl(2)
  }
  if (dashboard.bodyFat) {
    h3('Body Composition', [109, 40, 217])
    body(`Body Fat: ${dashboard.bodyFat.bodyFat}%  (${dashboard.bodyFat.category})  |  Fat Mass: ${dashboard.bodyFat.fatMass} ${wUnit}  |  Lean Mass: ${dashboard.bodyFat.leanMass} ${wUnit}`)
    nl(2)
  }

  // ════════════════════════════════════════════════
  // SECTION 2: AI PLAN
  // ════════════════════════════════════════════════
  if (aiPlan) {
    checkPage(20)
    divider()
    h1('AI Health Plan', [22, 101, 52])
    body(`Goal: ${aiPlan.goalLabel}`)
    body(aiPlan.summary)
    nl(3)

    if (aiPlan.timeline.weeksToGoal > 0) {
      body(`Timeline: ${aiPlan.timeline.weeksToGoal} weeks  |  Weekly change: ${aiPlan.timeline.weeklyChange} ${wUnit}/week  |  Target weight: ${aiPlan.timeline.targetWeight} ${wUnit}`)
      nl(2)
    }

    // Diet
    checkPage(30)
    divider()
    h2('Diet Recommendations')
    const diet = aiPlan.dietOptions[0]
    h3(`${diet.name} - ${diet.tag}`, [22, 101, 52])
    body(diet.description)
    body(`Daily calories: ${diet.calories.toLocaleString()} kcal  |  Protein: ${diet.macros.protein}g  |  Carbs: ${diet.macros.carbs}g  |  Fat: ${diet.macros.fat}g`)
    nl(2)
    h3('Recommended Foods')
    diet.foods.forEach(f => bullet(f))
    nl(2)
    h3('Limit / Avoid', [185, 28, 28])
    diet.avoid.forEach(f => bullet(f))
    nl(2)

    // All 4 diet options summary
    checkPage(20)
    h3('All Diet Options')
    aiPlan.dietOptions.forEach(d => {
      body(`${d.name}: ${d.calories.toLocaleString()} kcal  |  P: ${d.macros.protein}g  C: ${d.macros.carbs}g  F: ${d.macros.fat}g  (${d.tag})`, 3)
    })
    nl(3)
  }
  doc.save('mybmi-health-report.pdf')
}



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
function ResultsPayoff({ dashboard, unitSystem, name, onContinue }: {
  dashboard: Dashboard; unitSystem: UnitSystem; name: string; onContinue: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const greeting = name && name !== 'there' ? name : null
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero */}
      <div className="text-center pt-4 pb-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          {greeting ? `Your numbers are in, ${greeting}!` : 'Your numbers are in!'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Here's your health baseline. Track your progress by checking in regularly.
        </p>
      </div>

      {/* BMI highlight */}
      {dashboard.bmi && (
        <div className="rounded-2xl border p-5 text-center space-y-2"
          style={{ borderColor: dashboard.bmi.color + '55', background: dashboard.bmi.color + '11' }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Body Mass Index</p>
          <p className="text-5xl font-bold" style={{ color: dashboard.bmi.color }}>{dashboard.bmi.bmi}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ color: dashboard.bmi.color, borderColor: dashboard.bmi.color + '66', background: dashboard.bmi.color + '15' }}>
              {dashboard.bmi.label}
            </span>
          </div>
          <ArcGauge value={dashboard.bmi.bmi} min={10} max={40} color={dashboard.bmi.color} segments={BMI_SEGMENTS} />

          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">{dashboard.bmi.tip}</p>
        </div>
      )}

      {/* Supporting metrics */}
      <div className="grid grid-cols-3 gap-3">
        {dashboard.bmr && (
          <div className="rounded-xl border border-border/50 p-3 text-center bg-card">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">BMR</p>
            <p className="text-lg font-bold text-orange-400">{dashboard.bmr.bmr.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal/day</p>
          </div>
        )}
        {dashboard.tdee && (
          <div className="rounded-xl border border-border/50 p-3 text-center bg-card">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">TDEE</p>
            <p className="text-lg font-bold text-yellow-400">{dashboard.tdee.tdee.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal/day</p>
          </div>
        )}
        {dashboard.bodyFat && (
          <div className="rounded-xl border border-border/50 p-3 text-center bg-card">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Body Fat</p>
            <p className="text-lg font-bold" style={{ color: dashboard.bodyFat.color }}>{dashboard.bodyFat.bodyFat}%</p>
            <p className="text-[10px] text-muted-foreground capitalize">{dashboard.bodyFat.category}</p>
          </div>
        )}
        {!dashboard.bmr && !dashboard.tdee && !dashboard.bodyFat && (
          <div className="col-span-3 text-center py-3">
            <p className="text-xs text-muted-foreground">Add age in your next check-in to unlock BMR & TDEE</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
        Go to my dashboard <ChevronRight className="w-5 h-5" />
      </button>
      <p className="text-center text-xs text-muted-foreground pb-2">
        <Info className="w-3 h-3 inline mr-1" />For informational purposes only. Not medical advice.
      </p>
    </div>
  )
}

// ─── Home Page ─────────────────────────────────────────────────────────────
function HomePage({ dashboard, unitSystem, checkIns, profile, onNewCheckin, onOpenDashboard, onViewProgress, onEditProfile }: {
  dashboard: Dashboard; unitSystem: UnitSystem
  checkIns: CheckIn[]; profile: UserProfile | null
  onNewCheckin: () => void; onOpenDashboard: () => void
  onViewProgress: () => void; onEditProfile: () => void
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
        type Insight = { icon: React.ReactNode; text: string; color: string }
        const insights: Insight[] = []
        const iconCls = 'w-4 h-4 flex-shrink-0 mt-0.5'
        if (b.category === 'obese' || b.category === 'overweight') {
          insights.push({ icon: <Target className={`${iconCls} text-orange-400`} />, text: `Your goal weight is ${b.idealWeightMax} ${wUnit}. A 500 kcal/day deficit gets you there.`, color: 'text-orange-400' })
        } else if (b.category === 'normal') {
          insights.push({ icon: <CheckCircle2 className={`${iconCls} text-primary`} />, text: `Your BMI is in the healthy range. Focus on maintaining with consistent check-ins.`, color: 'text-primary' })
        } else if (b.category === 'underweight') {
          insights.push({ icon: <Zap className={`${iconCls} text-blue-400`} />, text: `You're below healthy weight. Consider a calorie surplus to reach ${b.idealWeightMin} ${wUnit}.`, color: 'text-blue-400' })
        }
        if (dashboard.tdee) {
          insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${dashboard.tdee.tdee.toLocaleString()} kcal/day. To lose weight, eat around ${dashboard.tdee.deficit.toLocaleString()} kcal.`, color: 'text-yellow-400' })
        }
        if (checkIns.length === 1) {
          insights.push({ icon: <TrendingUp className={`${iconCls} text-muted-foreground`} />, text: `Log your second check-in to start seeing your progress trend.`, color: 'text-muted-foreground' })
        }
        if (insights.length === 0) return null
        return (
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick insights</p>
            <div className="space-y-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3">
                  {ins.icon}
                  <p className={`text-xs leading-relaxed ${ins.color}`}>{ins.text}</p>
                </div>
              ))}
            </div>
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

// ─── Results Summary (legacy — replaced by HomePage) ──────────────────────
function ResultsSummary({
  dashboard, unitSystem, onNewCheckin, onOpenDashboard,
  onDownloadPDF, aiPlan, onGeneratePlan, dashboardCount, onEditProfile,
}: {
  dashboard: Dashboard; unitSystem: UnitSystem
  onNewCheckin: () => void; onOpenDashboard: () => void
  onDownloadPDF: () => void
  aiPlan: AIPlan | null; onGeneratePlan: () => void
  dashboardCount: number; onEditProfile: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const metrics = [
    { label: 'BMI',       value: dashboard.bmi      ? `${dashboard.bmi.bmi}`                    : '—', sub: dashboard.bmi?.label           ?? 'not calc.',   color: dashboard.bmi?.color },
    { label: 'BMR',       value: dashboard.bmr      ? `${dashboard.bmr.bmr.toLocaleString()}`   : '—', sub: dashboard.bmr              ? 'kcal' : 'needs age', color: 'hsl(200 80% 55%)' },
    { label: 'TDEE',      value: dashboard.tdee     ? `${dashboard.tdee.tdee.toLocaleString()}` : '—', sub: dashboard.tdee             ? 'kcal' : 'needs age', color: 'hsl(35 95% 55%)' },
    { label: 'Body Fat',  value: dashboard.bodyFat  ? `${dashboard.bodyFat.bodyFat}%`            : '—', sub: dashboard.bodyFat?.category ?? 'skipped',        color: dashboard.bodyFat?.color },
  ]
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Check-in complete banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">Last check-in</p>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEditProfile}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-colors flex-shrink-0 underline underline-offset-2">
            Edit profile
          </button>
          <button onClick={onNewCheckin}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            New Check-in
          </button>
        </div>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-border/50 p-3 text-center bg-card">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: m.color ?? 'inherit' }}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{m.sub}</p>
          </div>
        ))}
      </div>

      {!dashboard.bmr && dashboard.bmi && (
        <p className="text-xs text-muted-foreground text-center">
          BMR & TDEE require age —{' '}
          <button onClick={onNewCheckin} className="underline hover:text-foreground">add it in a new check-in</button>
        </p>
      )}

      {/* Primary CTA — View Dashboard */}
      <button onClick={onOpenDashboard}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group shadow-sm overflow-hidden relative">
        {/* Left accent bar */}
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
        <div className="flex items-center gap-3 ml-2">
          <BarChart2 className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold">View Full Dashboard</p>
            <p className="text-xs text-muted-foreground">
              {dashboardCount} metric{dashboardCount !== 1 ? 's' : ''} · PDF report · AI plan
            </p>

          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </button>

    </div>
  )
}

// ─── Mini Progress Strip ────────────────────────────────────────────────────
function MiniProgress({ checkIns, unitSystem, onViewProgress }: {
  checkIns: CheckIn[]; unitSystem: UnitSystem; onViewProgress: () => void
}) {
  if (checkIns.length < 2) return null
  const last = checkIns[checkIns.length - 1]
  const prev = checkIns[checkIns.length - 2]
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'

  const wDelta = last.dashboard.bmi && prev.dashboard.bmi
    ? (parseFloat(last.inputs.weight) - parseFloat(prev.inputs.weight))
    : null
  const bmiDelta = last.dashboard.bmi && prev.dashboard.bmi
    ? (last.dashboard.bmi.bmi - prev.dashboard.bmi.bmi)
    : null

  const TrendIcon = ({ delta }: { delta: number | null }) => {
    if (delta === null) return <Minus className="w-3 h-3 text-muted-foreground" />
    if (Math.abs(delta) < 0.1) return <Minus className="w-3 h-3 text-muted-foreground" />
    return delta < 0
      ? <ArrowDownRight className="w-3 h-3 text-green-400" />
      : <ArrowUpRight className="w-3 h-3 text-red-400" />
  }

  return (
    <button onClick={onViewProgress}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold">Your Progress</p>
          <p className="text-[10px] text-muted-foreground">{checkIns.length} check-ins recorded</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {wDelta !== null && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Weight</p>
            <p className="text-xs font-semibold flex items-center gap-0.5 justify-end">
              <TrendIcon delta={wDelta} />
              {Math.abs(wDelta).toFixed(1)} {wUnit}
            </p>
          </div>
        )}
        {bmiDelta !== null && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">BMI</p>
            <p className="text-xs font-semibold flex items-center gap-0.5 justify-end">
              <TrendIcon delta={bmiDelta} />
              {Math.abs(bmiDelta).toFixed(1)}
            </p>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  )
}

// ─── Progress Page ──────────────────────────────────────────────────────────
const CHART_COLORS = {
  weight:  '#22c55e',
  bmi:     '#3b82f6',
  bodyfat: '#f97316',
  tdee:    '#eab308',
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.value}{unit}
        </p>
      ))}
    </div>
  )
}

function ProgressPage({ checkIns, unitSystem, onClear, onBack }: {
  checkIns: CheckIn[]; unitSystem: UnitSystem
  onClear: () => void; onBack: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const [confirmClear, setConfirmClear] = useState(false)

  const chartData = checkIns.map(c => ({

    date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: parseFloat(c.inputs.weight) || null,
    bmi: c.dashboard.bmi?.bmi ?? null,
    bodyfat: c.dashboard.bodyFat?.bodyFat ?? null,
    bmr: c.dashboard.bmr?.bmr ?? null,
    tdee: c.dashboard.tdee?.tdee ?? null,
  }))

  // Summary stats
  const first = checkIns[0]
  const last  = checkIns[checkIns.length - 1]
  const wFirst = parseFloat(first?.inputs.weight) || 0
  const wLast  = parseFloat(last?.inputs.weight) || 0
  const wChange = checkIns.length > 1 ? wLast - wFirst : null
  const bmiFirst = first?.dashboard.bmi?.bmi ?? null
  const bmiLast  = last?.dashboard.bmi?.bmi ?? null
  const bmiChange = bmiFirst && bmiLast && checkIns.length > 1 ? bmiLast - bmiFirst : null

  const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="rounded-xl border border-border/50 p-3 text-center bg-card">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: color ?? 'inherit' }}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )

  const ChartCard = ({ title, dataKey, unit, color, domain }: {
    title: string; dataKey: string; unit: string; color: string; domain?: [any, any]
  }) => {
    const hasData = chartData.some(d => (d as any)[dataKey] !== null)
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {!hasData ? (
            <div className="h-32 flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary/30" />
              <p className="text-xs text-muted-foreground">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} domain={domain ?? ['auto', 'auto']} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <Line
                  type="monotone" dataKey={dataKey} stroke={color}
                  strokeWidth={2.5} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    )
  }

  if (checkIns.length === 0) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Progress</h2>
      </div>
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <TrendingUp className="w-8 h-8 text-primary/60" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-bold">No progress yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">Complete your first check-in to start tracking your health journey over time.</p>
        </div>
        <button onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Start first check-in
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Progress</h2>
            <p className="text-xs text-muted-foreground">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />Clear all
          </button>
        ) : (

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Are you sure?</span>
            <button onClick={() => { onClear(); setConfirmClear(false) }}
              className="text-xs text-destructive font-semibold px-2 py-1 rounded hover:bg-destructive/10">Yes, clear</button>
            <button onClick={() => setConfirmClear(false)}
              className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-secondary">Cancel</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Check-ins" value={String(checkIns.length)} sub="total" />
        <StatCard
          label="Weight change"
          value={wChange !== null ? `${wChange > 0 ? '+' : ''}${wChange.toFixed(1)} ${wUnit}` : '—'}
          sub={wChange !== null ? (wChange < 0 ? 'lost 🎉' : wChange > 0 ? 'gained' : 'same') : 'need 2+'}
          color={wChange !== null ? (wChange < 0 ? '#22c55e' : wChange > 0 ? '#f97316' : undefined) : undefined}
        />
        <StatCard
          label="BMI change"
          value={bmiChange !== null ? `${bmiChange > 0 ? '+' : ''}${bmiChange.toFixed(1)}` : '—'}
          sub={bmiChange !== null ? (bmiChange < 0 ? 'improving ⬇' : bmiChange > 0 ? 'increasing ⬆' : 'stable') : 'need 2+'}
          color={bmiChange !== null ? (bmiChange < 0 ? '#22c55e' : bmiChange > 0 ? '#f97316' : undefined) : undefined}
        />
        <StatCard
          label="Latest BMI"
          value={bmiLast ? String(bmiLast) : '—'}
          sub={last?.dashboard.bmi?.label ?? ''}
          color={last?.dashboard.bmi?.color}
        />
      </div>

      {/* Charts */}
      <ChartCard title={`Weight (${wUnit})`}   dataKey="weight"  unit={` ${wUnit}`} color={CHART_COLORS.weight} />
      <ChartCard title="BMI"                   dataKey="bmi"     unit=""           color={CHART_COLORS.bmi} />
      <ChartCard title="Body Fat %"            dataKey="bodyfat" unit="%"          color={CHART_COLORS.bodyfat} />
      <ChartCard title="TDEE (kcal/day)"       dataKey="tdee"    unit=" kcal"      color={CHART_COLORS.tdee} />

      {/* History list */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Check-in History</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {[...checkIns].reverse().map((c, i) => (
            <div key={c.id} className={`flex items-center justify-between py-2.5 ${
              i < checkIns.length - 1 ? 'border-b border-border/30' : ''
            }`}>
              <div>
                <p className="text-xs font-semibold">
                  {new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.inputs.weight} {c.unitSystem === 'metric' ? 'kg' : 'lbs'}
                  {c.inputs.age ? ` · Age ${c.inputs.age}` : ''}
                  {' · '}{c.inputs.sex}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                {c.dashboard.bmi && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">BMI</p>
                    <p className="text-xs font-bold" style={{ color: c.dashboard.bmi.color }}>{c.dashboard.bmi.bmi}</p>
                  </div>
                )}
                {c.dashboard.bodyFat && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Body Fat</p>
                    <p className="text-xs font-bold" style={{ color: c.dashboard.bodyFat.color }}>{c.dashboard.bodyFat.bodyFat}%</p>
                  </div>
                )}
                {c.dashboard.tdee && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">TDEE</p>
                    <p className="text-xs font-bold text-yellow-400">{c.dashboard.tdee.tdee.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center pb-2">
        <p className="text-xs text-muted-foreground">
          <Info className="w-3 h-3 inline mr-1" />Data stored locally on this device only.
        </p>
      </div>
    </div>
  )
}

// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// ─── Dashboard Page (inline full-page view) ────────────────────────────────
function DashboardPage({ dashboard, unitSystem, aiPlan, onGeneratePlan, inputs, activityLevel, onDownloadPDF, onBack, onNewCheckin }: {
  dashboard: Dashboard; unitSystem: UnitSystem
  aiPlan: AIPlan | null; onGeneratePlan: () => void
  inputs: SharedInputs; activityLevel: ActivityLevel
  onDownloadPDF: () => void; onBack: () => void; onNewCheckin: () => void

}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const hasAny = dashboard.bmi || dashboard.bmr || dashboard.tdee || dashboard.bodyFat
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Dashboard</h2>
            <p className="text-xs text-muted-foreground">{[dashboard.bmi, dashboard.bmr, dashboard.tdee, dashboard.bodyFat].filter(Boolean).length} metrics</p>
          </div>
        </div>
        <button onClick={onNewCheckin}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md text-sm font-semibold
            bg-primary text-primary-foreground shadow-md shadow-primary/25
            hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-lg
            transition-all duration-200 active:scale-[0.97]">
          + Check-in
        </button>
      </div>
      {!hasAny && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <BarChart2 className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">No data yet</p>
            <p className="text-xs text-muted-foreground">Complete a check-in to populate your dashboard.</p>
          </div>
        </div>
      )}
      {/* ── BMI Hero ── */}
      {dashboard.bmi && (() => { const r = dashboard.bmi!; return (
        <div className="card-hero rounded-2xl border p-6 space-y-4" style={{ borderColor: r.color + '40', background: `linear-gradient(145deg, ${r.color}18 0%, ${r.color}08 100%)` }}>
          {/* Label row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Body Mass Index</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ color: r.color, borderColor: r.color + '60', background: r.color + '18' }}>{r.label}</span>
          </div>
          {/* Gauge + number side by side on desktop */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-48 flex-shrink-0">
              <ArcGauge value={r.bmi} min={10} max={40} color={r.color} segments={BMI_SEGMENTS} />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <p className="text-7xl font-black tracking-tight leading-none" style={{ color: r.color }}>{r.bmi}</p>
                <p className="text-sm text-muted-foreground mt-1">out of 40 max</p>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-6">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy range</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{r.idealWeightMin}–{r.idealWeightMax} {wUnit}</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: r.color }}>{r.label}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4" style={{ borderColor: r.color + '25' }}>{r.tip}</p>
        </div>
      )})()}

      {/* ── Calorie metrics side by side ── */}
      {(dashboard.bmr || dashboard.tdee) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard.bmr && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">BMR</span>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center"><Flame className="w-4 h-4 text-orange-400" /></div>
              </div>
              <p className="text-5xl font-black tracking-tight text-orange-400 leading-none">{dashboard.bmr.bmr.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">kcal/day at rest</p>
              <p className="text-[11px] text-muted-foreground/70 pt-1 border-t border-border/40">Mifflin-St Jeor formula · minimum calories to survive</p>
            </div>
          )}
          {dashboard.tdee && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">TDEE</span>
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Zap className="w-4 h-4 text-yellow-400" /></div>
              </div>
              <p className="text-5xl font-black tracking-tight text-yellow-400 leading-none">{dashboard.tdee.tdee.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">kcal/day · {dashboard.tdee.activityLabel}</p>
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/40">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Lose</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{dashboard.tdee.deficit.toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Maintain</p>
                  <p className="text-xs font-bold text-blue-400 mt-0.5">{dashboard.tdee.tdee.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Gain</p>
                  <p className="text-xs font-bold text-purple-400 mt-0.5">{dashboard.tdee.surplus.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Body Fat ── */}
      {dashboard.bodyFat && (() => { const r = dashboard.bodyFat!; return (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Body Fat</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ color: r.color, borderColor: r.color + '60', background: r.color + '18' }}>{r.category}</span>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-black tracking-tight leading-none" style={{ color: r.color }}>{r.bodyFat}%</p>
            <p className="text-sm text-muted-foreground mb-1">body fat</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fat Mass</p>
              <p className="text-lg font-bold mt-1">{r.fatMass} <span className="text-xs font-normal text-muted-foreground">{wUnit}</span></p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lean Mass</p>
              <p className="text-lg font-bold mt-1">{r.leanMass} <span className="text-xs font-normal text-muted-foreground">{wUnit}</span></p>
            </div>
          </div>
        </div>
      )})()}
      {/* AI Plan CTA — above download */}
      {dashboard.bmi && (
        <><Separator />
          {!aiPlan ? (
            <button onClick={onGeneratePlan} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-primary/60 bg-primary/12 transition-all group relative overflow-hidden ai-plan-btn">
              <div className="flex items-center gap-3 relative">
                <div className="w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left"><p className="text-sm font-semibold text-primary">Get Your AI Health Plan</p><p className="text-xs text-muted-foreground">Diet · Exercise · Goal timeline</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/70 transition-all relative" />
            </button>
          ) : <AIPlanSection plan={aiPlan} unitSystem={unitSystem} />}
        </>
      )}
      {/* Download Report — below AI plan */}
      {hasAny && (
        <><Separator />
          <button onClick={onDownloadPDF} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"><svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2M7 10V7a5 5 0 0110 0v3" /></svg></div>
              <div className="text-left"><p className="text-sm font-medium">Download Health Report</p><p className="text-xs text-muted-foreground">PDF · All metrics{aiPlan ? ' + AI plan' : ''} · Free</p></div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />

          </button>
        </>
      )}
      <div className="text-center pb-4"><p className="text-xs text-muted-foreground"><Info className="w-3 h-3 inline mr-1" />For informational purposes only.</p></div>
    </div>
  )
}

function DashboardPanel({ dashboard, open, onClose, unitSystem, aiPlan, onGeneratePlan, inputs, activityLevel, onDownloadPDF }: {
  dashboard: Dashboard; open: boolean; onClose: () => void; unitSystem: UnitSystem
  aiPlan: AIPlan | null; onGeneratePlan: () => void
  inputs: SharedInputs; activityLevel: ActivityLevel
  onDownloadPDF: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const hasAny = dashboard.bmi || dashboard.bmr || dashboard.tdee || dashboard.bodyFat
  const canGeneratePlan = !!dashboard.bmi
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { if (!open) setExpanded(false) }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel: slides up full-screen on mobile, side panel on desktop */}
      <div className={[
        'fixed bg-card z-50 overflow-y-auto transition-all duration-300 ease-in-out',
        // Mobile: bottom sheet, slides up
        'inset-x-0 bottom-0 rounded-t-2xl max-h-[93dvh]',
        // Desktop: right side panel
        'sm:inset-y-0 sm:left-auto sm:right-0 sm:rounded-none sm:max-h-full sm:border-l sm:border-border',
        expanded ? 'sm:w-full' : 'sm:w-[440px]',
        open
          ? 'translate-y-0 sm:translate-x-0'
          : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
      ].join(' ')}>

        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            <span className="font-semibold text-base">Your Dashboard</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand button — desktop only */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="hidden sm:flex p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand to full screen'}>
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!hasAny && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <BarChart2 className="w-8 h-8 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold">Nothing to show</p>
                <p className="text-xs text-muted-foreground">Complete a check-in to see your metrics here.</p>
              </div>
            </div>
          )}

          {/* BMI */}
          {dashboard.bmi && (() => { const r = dashboard.bmi!; return (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: r.color + '55', background: r.color + '11' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">BMI</span>
                <Badge variant="outline" style={{ color: r.color, borderColor: r.color }}>{r.label}</Badge>
              </div>
              <ArcGauge value={r.bmi} min={10} max={40} color={r.color} segments={BMI_SEGMENTS} />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold" style={{ color: r.color }}>{r.bmi}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Body Mass Index</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Healthy range</p>
                  <p className="font-semibold text-foreground">{r.idealWeightMin}–{r.idealWeightMax} {wUnit}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{r.tip}</p>
            </div>
          )})()}

          {/* BMR */}
          {dashboard.bmr && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">

                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">BMR</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-orange-400">{dashboard.bmr.bmr.toLocaleString()} <span className="text-base font-normal text-muted-foreground">kcal/day</span></p>
              <p className="text-xs text-muted-foreground">Calories at rest · {dashboard.bmr.formula} formula</p>
              <div className="bg-secondary/50 rounded-lg p-3 text-xs">
                <p className="font-medium mb-1">What this means</p>
                <p className="text-muted-foreground">Even lying still all day, your body burns {dashboard.bmr.bmr.toLocaleString()} kcal.</p>
              </div>
            </div>
          )}

          {/* TDEE */}
          {dashboard.tdee && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">TDEE</span>
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-yellow-400">{dashboard.tdee.tdee.toLocaleString()} <span className="text-base font-normal text-muted-foreground">kcal/day</span></p>
              <p className="text-xs text-muted-foreground">At <span className="text-foreground">{dashboard.tdee.activityLabel}</span> activity level.</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Weight Loss</p>
                  <p className="text-sm font-bold text-green-400">{dashboard.tdee.deficit.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Maintain</p>
                  <p className="text-sm font-bold text-blue-400">{dashboard.tdee.tdee.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Weight Gain</p>
                  <p className="text-sm font-bold text-purple-400">{dashboard.tdee.surplus.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                </div>
              </div>
            </div>
          )}

          {/* Body Fat */}
          {dashboard.bodyFat && (() => { const r = dashboard.bodyFat!; return (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Body Fat</span>
                <Badge variant="outline" style={{ color: r.color, borderColor: r.color }}>{r.category}</Badge>
              </div>
              <p className="text-3xl font-bold" style={{ color: r.color }}>{r.bodyFat}%</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Fat Mass</p>
                  <p className="text-sm font-bold">{r.fatMass} {wUnit}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Lean Mass</p>
                  <p className="text-sm font-bold">{r.leanMass} {wUnit}</p>
                </div>
              </div>
            </div>
          )})()}

          {/* Full profile summary */}
          {dashboard.bmi && dashboard.bmr && dashboard.tdee && dashboard.bodyFat && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Full Profile</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">BMI</span><span className="font-semibold">{dashboard.bmi.bmi} — {dashboard.bmi.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">BMR</span><span className="font-semibold">{dashboard.bmr.bmr.toLocaleString()} kcal</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TDEE</span><span className="font-semibold">{dashboard.tdee.tdee.toLocaleString()} kcal</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Body Fat</span><span className="font-semibold">{dashboard.bodyFat.bodyFat}%</span></div>
              </div>
            </div>
          )}

          {/* ── AI Plan CTA / Plan ── */}
          {/* Download PDF button — always shown when there's any data */}
          {hasAny && (
            <>
              <Separator />
              <button
                onClick={onDownloadPDF}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-gradient-to-r hover:from-emerald-500/15 hover:to-cyan-500/10 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all duration-300 group shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2M7 10V7a5 5 0 0110 0v3" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-primary">Download Health Report</p>
                    <p className="text-xs text-muted-foreground">PDF · All metrics{aiPlan ? ' + AI plan' : ''} · Free</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
              </button>
            </>
          )}

          {canGeneratePlan && (

            <>
              <Separator />
              {!aiPlan ? (
                <button onClick={onGeneratePlan}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-primary/60 bg-primary/12 transition-all group overflow-hidden relative ai-plan-btn">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center transition-colors">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-primary">Get Your AI Health Plan</p>
                      <p className="text-xs text-muted-foreground">Diet · Exercise · Goal timeline</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary/70 transition-all" />
                </button>
              ) : (
                <AIPlanSection plan={aiPlan} unitSystem={unitSystem} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Account Page ────────────────────────────────────────────────────────────
function AccountPage({ profile, onEditProfile }: {
  profile: UserProfile | null
  onEditProfile: () => void
}) {
  const heightDisplay = profile
    ? profile.unitSystem === 'imperial'
      ? `${profile.heightFt}'${profile.heightIn}"`
      : `${profile.height} cm`
    : '—'

  const lockedFeatures = [
    { icon: '🍎', title: 'Apple Health Sync', desc: 'Auto-import weight & workouts', tag: 'Coming soon' },
    { icon: '📊', title: 'Fitbit Integration', desc: 'Sync steps, heart rate & sleep', tag: 'Coming soon' },
    { icon: '⭐', title: 'Go Pro', desc: 'AI insights, unlimited history & no ads', tag: 'Upgrade', highlight: true },
  ]

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold">Account</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your profile and settings</p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {profile?.name && profile.name !== 'there' ? profile.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">
              {profile?.name && profile.name !== 'there' ? profile.name : 'No name set'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {heightDisplay}{profile?.age ? ` · ${profile.age}y` : ''} · {profile?.sex ?? '—'} · {profile?.unitSystem ?? 'imperial'}
            </p>
          </div>
          <button onClick={onEditProfile}
            className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all flex-shrink-0">
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
          <div key={f.title} className={`flex items-center gap-4 px-4 py-4 rounded-xl border ${
            f.highlight
              ? 'border-primary/30 bg-primary/5'
              : 'border-border/50 bg-card'
          } opacity-70`}>
            <span className="text-2xl flex-shrink-0">{f.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>

            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
              f.highlight
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'bg-secondary text-muted-foreground'
            }`}>
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ─ Profile is the source of truth for constants (height, age, sex) ─
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
  const [page, setPage] = useState<'onboarding' | 'results' | 'home' | 'checkin' | 'progress' | 'dashboard' | 'account'>(
    () => loadProfile() ? 'home' : 'onboarding'
  )
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => loadCheckIns())

  // Derive unitSystem from profile (or default imperial for onboarding)
  const unitSystem: UnitSystem = profile?.unitSystem ?? 'imperial'
  // Onboarding-specific unit state (before profile exists)
  const [onboardingUnit, setOnboardingUnit] = useState<UnitSystem>('imperial')
  const activeUnit = profile ? unitSystem : onboardingUnit

  useEffect(() => { document.documentElement.className = isDark ? 'dark' : 'light' }, [isDark])

  // ─ Calculate all 4 metrics silently (no dashboard open, no individual state calls) ─
  const calcAllSilently = useCallback((
    inp: SharedInputs, unit: UnitSystem, activity: ActivityLevel,
    neckV: string, waistV: string, hipV: string, skipBodyFat: boolean
  ): Dashboard | null => {
    const hm = unit === 'metric'
      ? parseFloat(inp.height) / 100
      : ((parseFloat(inp.heightFt)||0)*12 + (parseFloat(inp.heightIn)||0)) * 0.0254
    const w = parseFloat(inp.weight)
    const wkg = unit === 'metric' ? w : w * 0.453592
    if (!hm || !wkg || hm <= 0 || wkg <= 0) return null

    const f = unit === 'metric' ? 1 : 2.20462
    const bmiVal = Math.round((wkg / (hm * hm)) * 10) / 10
    const idealMin = Math.round(18.5 * hm * hm * f * 10) / 10
    const idealMax = Math.round(24.9 * hm * hm * f * 10) / 10
    let bmiCat: BMICategory, bmiLabel: string, bmiColor: string, bmiTip: string
    if (bmiVal < 18.5)      { bmiCat='underweight'; bmiLabel='Underweight';   bmiColor='hsl(200 80% 55%)'; bmiTip='Focus on nutrient-dense foods and consult a healthcare provider.' }
    else if (bmiVal < 25)  { bmiCat='normal';      bmiLabel='Normal Weight'; bmiColor='hsl(142 76% 45%)'; bmiTip='Great! Maintain your healthy habits with regular exercise and balanced nutrition.' }
    else if (bmiVal < 30)  { bmiCat='overweight';  bmiLabel='Overweight';    bmiColor='hsl(35 95% 55%)';  bmiTip='Consider a balanced diet and increased physical activity.' }
    else                   { bmiCat='obese';        bmiLabel='Obese';         bmiColor='hsl(0 84% 60%)';   bmiTip='We recommend seeking professional medical guidance for a personalized plan.' }
    const bmiResult: BMIResult = { bmi: bmiVal, category: bmiCat, label: bmiLabel, color: bmiColor, tip: bmiTip, idealWeightMin: idealMin, idealWeightMax: idealMax }

    const age = parseInt(inp.age)
    let bmrResult: BMRResult | null = null
    let tdeeResult: TDEEResult | null = null
    if (age > 0) {
      const hcm = hm * 100
      const bmr = inp.sex === 'male' ? Math.round(10*wkg+6.25*hcm-5*age+5) : Math.round(10*wkg+6.25*hcm-5*age-161)
      bmrResult = { bmr, formula: 'Mifflin-St Jeor' }
      const act = ACTIVITY_LEVELS.find(a => a.value === activity)!
      const tdee = Math.round(bmr * act.multiplier)
      tdeeResult = { tdee, bmr, activityLabel: act.label, deficit: tdee - 500, surplus: tdee + 300 }
    }

    let bodyFatResult: BodyFatResult | null = null

    if (!skipBodyFat) {
      const nV = parseFloat(neckV), wV2 = parseFloat(waistV), hV = parseFloat(hipV)
      if (nV > 0 && wV2 > 0 && (inp.sex === 'male' || hV > 0)) {
        const fc = unit === 'imperial' ? 2.54 : 1
        const nCm = nV*fc, wCm = wV2*fc, hCm2 = hV*fc, htCm = hm*100
        let bf = inp.sex === 'male'
          ? 86.01*Math.log10(wCm-nCm) - 70.041*Math.log10(htCm) + 36.76
          : 163.205*Math.log10(wCm+hCm2-nCm) - 97.684*Math.log10(htCm) - 78.387
        bf = Math.max(0, Math.round(bf*10)/10)
        const fatMass = Math.round(wkg*(bf/100)*f*10)/10
        const leanMass = Math.round((w - fatMass)*10)/10
        let bfCat: string, bfColor: string
        if (inp.sex === 'male') {
          if (bf<6) { bfCat='Essential'; bfColor='hsl(200 80% 55%)' }
          else if (bf<14) { bfCat='Athletic'; bfColor='hsl(142 76% 45%)' }
          else if (bf<18) { bfCat='Fitness';  bfColor='hsl(142 76% 45%)' }
          else if (bf<25) { bfCat='Average';  bfColor='hsl(35 95% 55%)' }
          else            { bfCat='Obese';    bfColor='hsl(0 84% 60%)' }
        } else {
          if (bf<14) { bfCat='Essential'; bfColor='hsl(200 80% 55%)' }
          else if (bf<21) { bfCat='Athletic'; bfColor='hsl(142 76% 45%)' }
          else if (bf<25) { bfCat='Fitness';  bfColor='hsl(142 76% 45%)' }
          else if (bf<32) { bfCat='Average';  bfColor='hsl(35 95% 55%)' }
          else            { bfCat='Obese';    bfColor='hsl(0 84% 60%)' }
        }
        bodyFatResult = { bodyFat: bf, fatMass, leanMass, category: bfCat, color: bfColor }
      }
    }
    const result: Dashboard = { bmi: bmiResult, bmr: bmrResult, tdee: tdeeResult, bodyFat: bodyFatResult }
    setDashboard(result)
    setAiPlan(null)
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
    }
    if (isEditingProfile) {
      showToast('Profile updated ✓')
      setPage('home')
    } else {
      setPage('results') // payoff screen first
    }
  }

  // Check-in complete: merge weight into profile constants and recalculate
  const handleCheckinComplete = (skipBodyFat: boolean) => {
    if (!profile) return
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
    const plan = generateAIPlan(dashboard, inputs, unitSystem, activityLevel)
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
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      {/* ── Header ── */}
      <header className="border-b border-border/40 sticky top-0 z-30 bg-background/90 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight">mybmi.ai</span>
            <span className="text-muted-foreground/60 text-xs hidden sm:block font-normal">Health Calculators</span>
          </div>
          <div className="flex items-center gap-2">
            {page !== 'onboarding' && (
              <>
                <button onClick={() => setPage('progress')}
                  className={`hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border transition-colors font-medium ${page === 'progress' ? 'bg-secondary border-border text-foreground' : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  <TrendingUp className="w-4 h-4" />Progress
                </button>
                <button onClick={handleNewCheckin}
                  className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                  + Check-in
                </button>
              </>
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
              onContinue={() => { showToast('Welcome! 🎉'); setPage('home') }}
            />
          ) : page === 'home' ? (
            <HomePage
              dashboard={dashboard}
              unitSystem={activeUnit}
              checkIns={checkIns}
              profile={profile}
              onNewCheckin={handleNewCheckin}
              onOpenDashboard={() => setPage('dashboard')}
              onViewProgress={() => setPage('progress')}
              onEditProfile={handleEditProfile}
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
            />
          ) : (
            // Onboarding — first-time setup or edit profile
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
        <button onClick={() => setPage('progress')} className={`bottom-tab-item relative ${page === 'progress' ? 'text-primary' : 'text-muted-foreground'}`} aria-label="Progress">
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

