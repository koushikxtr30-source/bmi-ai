import type {
  SharedInputs, UnitSystem, ActivityLevel, BMICategory,
  BMIResult, BMRResult, TDEEResult, BodyFatResult, Dashboard
} from '@/types'
import { ACTIVITY_LEVELS } from '@/constants'

export function calculateDashboard(
  inp: SharedInputs,
  unit: UnitSystem,
  activity: ActivityLevel,
  neckV: string,
  waistV: string,
  hipV: string,
  skipBodyFat: boolean,
): Dashboard | null {
  const hm = unit === 'metric'
    ? parseFloat(inp.height) / 100
    : ((parseFloat(inp.heightFt) || 0) * 12 + (parseFloat(inp.heightIn) || 0)) * 0.0254
  const w = parseFloat(inp.weight)
  const wkg = unit === 'metric' ? w : w * 0.453592
  if (!hm || !wkg || hm <= 0 || wkg <= 0) return null

  const f = unit === 'metric' ? 1 : 2.20462
  const bmiVal = Math.round((wkg / (hm * hm)) * 10) / 10
  const idealMin = Math.round(18.5 * hm * hm * f * 10) / 10
  const idealMax = Math.round(24.9 * hm * hm * f * 10) / 10

  let bmiCat: BMICategory, bmiLabel: string, bmiColor: string, bmiTip: string
  if (bmiVal < 18.5)     { bmiCat = 'underweight'; bmiLabel = 'Underweight';   bmiColor = 'hsl(200 80% 55%)'; bmiTip = 'Focus on nutrient-dense foods and consult a healthcare provider.' }
  else if (bmiVal < 25)  { bmiCat = 'normal';      bmiLabel = 'Normal Weight'; bmiColor = 'hsl(142 76% 45%)'; bmiTip = 'Great! Maintain your healthy habits with regular exercise and balanced nutrition.' }
  else if (bmiVal < 30)  { bmiCat = 'overweight';  bmiLabel = 'Overweight';    bmiColor = 'hsl(35 95% 55%)';  bmiTip = 'Consider a balanced diet and increased physical activity.' }
  else                   { bmiCat = 'obese';        bmiLabel = 'Obese';         bmiColor = 'hsl(0 84% 60%)';   bmiTip = 'We recommend seeking professional medical guidance for a personalized plan.' }

  const bmiResult: BMIResult = { bmi: bmiVal, category: bmiCat, label: bmiLabel, color: bmiColor, tip: bmiTip, idealWeightMin: idealMin, idealWeightMax: idealMax }

  const age = parseInt(inp.age)
  let bmrResult: BMRResult | null = null
  let tdeeResult: TDEEResult | null = null
  if (age > 0) {
    const hcm = hm * 100
    const bmr = inp.sex === 'male'
      ? Math.round(10 * wkg + 6.25 * hcm - 5 * age + 5)
      : Math.round(10 * wkg + 6.25 * hcm - 5 * age - 161)
    bmrResult = { bmr, formula: 'Mifflin-St Jeor' }
    const act = ACTIVITY_LEVELS.find(a => a.value === activity)!
    const tdee = Math.round(bmr * act.multiplier)
    tdeeResult = { tdee, bmr, activityLabel: act.label, deficit: tdee - 500, surplus: tdee + 300 }
  }

  let bodyFatResult: BodyFatResult | null = null
  if (!skipBodyFat) {
    const nV = parseFloat(neckV), wV2 = parseFloat(waistV), hV = parseFloat(hipV)
    if (nV > 0 && wV2 > 0 && (inp.sex === 'male' || hV > 0)) {
      const toIn = (val: number) => unit === 'metric' ? val / 2.54 : val
      const nIn = toIn(nV), wIn = toIn(wV2), hIn = toIn(hV), htIn = hm * 100 / 2.54
      let bf = inp.sex === 'male'
        ? 86.01 * Math.log10(wIn - nIn) - 70.041 * Math.log10(htIn) + 36.76
        : 163.205 * Math.log10(wIn + hIn - nIn) - 97.684 * Math.log10(htIn) - 78.387
      bf = Math.max(0, Math.round(bf * 10) / 10)
      const fatMass = Math.round(wkg * (bf / 100) * f * 10) / 10
      const leanMass = Math.round((w - fatMass) * 10) / 10
      let bfCat: string, bfColor: string
      if (inp.sex === 'male') {
        if (bf < 6)       { bfCat = 'Essential'; bfColor = 'hsl(200 80% 55%)' }
        else if (bf < 14) { bfCat = 'Athletic';  bfColor = 'hsl(142 76% 45%)' }
        else if (bf < 18) { bfCat = 'Fitness';   bfColor = 'hsl(142 76% 45%)' }
        else if (bf < 25) { bfCat = 'Average';   bfColor = 'hsl(35 95% 55%)' }
        else              { bfCat = 'Obese';      bfColor = 'hsl(0 84% 60%)' }
      } else {
        if (bf < 14)      { bfCat = 'Essential'; bfColor = 'hsl(200 80% 55%)' }
        else if (bf < 21) { bfCat = 'Athletic';  bfColor = 'hsl(142 76% 45%)' }
        else if (bf < 25) { bfCat = 'Fitness';   bfColor = 'hsl(142 76% 45%)' }
        else if (bf < 32) { bfCat = 'Average';   bfColor = 'hsl(35 95% 55%)' }
        else              { bfCat = 'Obese';      bfColor = 'hsl(0 84% 60%)' }
      }
      bodyFatResult = { bodyFat: bf, fatMass, leanMass, category: bfCat, color: bfColor }
    }
  }

  return { bmi: bmiResult, bmr: bmrResult, tdee: tdeeResult, bodyFat: bodyFatResult }
}
