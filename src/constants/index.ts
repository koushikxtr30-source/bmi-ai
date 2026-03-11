import type { ActivityLevel } from '@/types'

export const ACTIVITY_LEVELS = [
  { value: 'sedentary'   as ActivityLevel, label: 'Sedentary',   multiplier: 1.2,   desc: 'Little or no exercise' },
  { value: 'light'       as ActivityLevel, label: 'Light',       multiplier: 1.375, desc: '1–3 days/week' },
  { value: 'moderate'    as ActivityLevel, label: 'Moderate',    multiplier: 1.55,  desc: '3–5 days/week' },
  { value: 'active'      as ActivityLevel, label: 'Active',      multiplier: 1.725, desc: '6–7 days/week' },
  { value: 'very_active' as ActivityLevel, label: 'Very Active', multiplier: 1.9,   desc: 'Hard training 2×/day' },
]

export const BMI_SEGMENTS = [
  { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
  { from: -135, to: -54,  color: 'hsl(142 76% 45%)' },
  { from: -54,  to: -18,  color: 'hsl(35 95% 55%)' },
  { from: -18,  to: 0,    color: 'hsl(0 84% 60%)' },
]

export const CHART_COLORS = {
  weight:  '#22c55e',
  bmi:     '#3b82f6',
  bodyfat: '#f97316',
  tdee:    '#eab308',
}
