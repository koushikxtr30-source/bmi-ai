// ─── Core Types ───────────────────────────────────────────────────────────────
export type UnitSystem = 'metric' | 'imperial'
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese' | null

export interface SharedInputs {
  weight: string
  height: string
  heightFt: string
  heightIn: string
  age: string
  sex: Sex
}

export interface BMIResult {
  bmi: number
  category: BMICategory
  label: string
  color: string
  tip: string
  idealWeightMin: number
  idealWeightMax: number
}

export interface BMRResult {
  bmr: number
  formula: string
}

export interface TDEEResult {
  tdee: number
  bmr: number
  activityLabel: string
  deficit: number
  surplus: number
}

export interface BodyFatResult {
  bodyFat: number
  fatMass: number
  leanMass: number
  category: string
  color: string
}

export interface Dashboard {
  bmi: BMIResult | null
  bmr: BMRResult | null
  tdee: TDEEResult | null
  bodyFat: BodyFatResult | null
}

// ─── AI Plan Types ────────────────────────────────────────────────────────────
export interface MacroSplit {
  protein: number
  carbs: number
  fat: number
}

export interface DietOption {
  name: string
  emoji: string
  description: string
  calories: number
  macros: MacroSplit
  foods: string[]
  avoid: string[]
  tag: string
}

export interface ExerciseDay {
  day: string
  type: string
  intensity: string
  duration: string
  exercises: string[]
  rest: boolean
}

export interface Milestone {
  week: number
  label: string
  target: string
  action: string
}

export interface AIPlan {
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

// ─── User Profile ───────────────────────────────────────────────────────────
export interface UserProfile {
  name: string
  height: string
  heightFt: string
  heightIn: string
  age: string
  sex: Sex
  unitSystem: UnitSystem
  createdAt: string
}

// ─── Progress / CheckIn Types ─────────────────────────────────────────────────
export interface CheckIn {
  id: string
  date: string // ISO
  unitSystem: UnitSystem
  inputs: SharedInputs
  activityLevel: ActivityLevel
  dashboard: Dashboard
}
