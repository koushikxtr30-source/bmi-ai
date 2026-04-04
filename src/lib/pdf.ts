import { jsPDF } from 'jspdf'
import type { Dashboard, AIPlan, UnitSystem, SharedInputs } from '@/types'

export function clean(str: string): string {
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\u2019/g, "'")
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2192/g, '->')
    .replace(/[^\x00-\x7E\xA0-\xFF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function generateHealthPDF(
  dashboard: Dashboard,
  aiPlan: AIPlan | null,
  unitSystem: UnitSystem,
  inputs: SharedInputs,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 18, col = margin
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  let y = 0
  const nl = (n = 6) => { y += n }
  const checkPage = (needed = 20) => { if (y > 270 - needed) { doc.addPage(); y = 20 } }

  const h1 = (text: string, color: [number, number, number] = [15, 15, 15]) => {
    checkPage(14)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(clean(text), col, y); nl(10)
  }
  const h2 = (text: string) => {
    checkPage(12)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
    doc.text(clean(text), col, y); nl(7)
  }
  const h3 = (text: string, color: [number, number, number] = [80, 80, 80]) => {
    checkPage(9)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(clean(text).toUpperCase(), col, y); nl(5)
  }
  const body = (text: string, indent = 0) => {
    checkPage(7)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(clean(text), W - margin * 2 - indent)
    doc.text(lines, col + indent, y); nl(lines.length * 5)
  }
  const bullet = (text: string) => {
    checkPage(7)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(clean(text), W - margin * 2 - 5)
    doc.text('-', col + 1, y)
    doc.text(lines, col + 5, y); nl(lines.length * 4.8)
  }
  const divider = (color: [number, number, number] = [220, 220, 220]) => {
    checkPage(5)
    doc.setDrawColor(...color); doc.setLineWidth(0.3)
    doc.line(col, y, W - margin, y); nl(5)
  }
  const metricBox = (label: string, value: string, unit: string, x: number, boxW: number, color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(x, y, boxW, 18, 2, 2, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(label, x + boxW / 2, y + 5, { align: 'center' })
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20)
    doc.text(value, x + boxW / 2, y + 12, { align: 'center' })
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
    doc.text(unit, x + boxW / 2, y + 17, { align: 'center' })
  }

  // Cover header
  doc.setFillColor(12, 12, 14); doc.rect(0, 0, W, 42, 'F')
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('mybmi.ai', col, 18)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 170)
  doc.text('Personal Health Report', col, 26)
  doc.setFontSize(8); doc.setTextColor(120, 120, 130)
  doc.text(`Generated ${date}`, col, 33)
  if (inputs.age) {
    doc.text(`Age ${inputs.age}  |  ${inputs.sex === 'male' ? 'Male' : 'Female'}  |  ${inputs.weight} ${wUnit}`, W - margin, 33, { align: 'right' })
  }
  doc.setFillColor(34, 197, 94); doc.rect(0, 40, W, 2, 'F')
  y = 52

  // Section 1: Metrics
  h1('Health Metrics')
  divider()
  const bw = (W - margin * 2 - 9) / 4
  const bmiColor = dashboard.bmi?.category === 'normal' ? [220, 252, 231] as [number, number, number] :
    dashboard.bmi?.category === 'underweight' ? [219, 234, 254] as [number, number, number] :
    dashboard.bmi?.category === 'overweight' ? [254, 243, 199] as [number, number, number] : [254, 226, 226] as [number, number, number]
  if (dashboard.bmi) metricBox('BMI', String(dashboard.bmi.bmi), dashboard.bmi.label, col, bw, bmiColor)
  if (dashboard.bmr) metricBox('BMR', dashboard.bmr.bmr.toLocaleString(), 'kcal/day', col + bw + 3, bw, [255, 237, 213])
  if (dashboard.tdee) metricBox('TDEE', dashboard.tdee.tdee.toLocaleString(), 'kcal/day', col + (bw + 3) * 2, bw, [254, 252, 232])
  if (dashboard.bodyFat) metricBox('Body Fat', String(dashboard.bodyFat.bodyFat) + '%', dashboard.bodyFat.category, col + (bw + 3) * 3, bw, [243, 232, 255])
  nl(22)

  if (dashboard.bmi) {
    h3('BMI Analysis', [22, 101, 52])
    body(`Score: ${dashboard.bmi.bmi}  |  Category: ${dashboard.bmi.label}  |  Healthy weight: ${dashboard.bmi.idealWeightMin}–${dashboard.bmi.idealWeightMax} ${wUnit}`)
    body(dashboard.bmi.tip); nl(2)
  }
  if (dashboard.tdee) {
    h3('Calorie Targets', [161, 98, 7])
    body(`Maintain: ${dashboard.tdee.tdee.toLocaleString()} kcal/day  |  Loss (-500): ${dashboard.tdee.deficit.toLocaleString()} kcal/day  |  Gain (+300): ${dashboard.tdee.surplus.toLocaleString()} kcal/day`)
    nl(2)
  }
  if (dashboard.bodyFat) {
    h3('Body Composition', [109, 40, 217])
    body(`Body Fat: ${dashboard.bodyFat.bodyFat}%  (${dashboard.bodyFat.category})  |  Fat Mass: ${dashboard.bodyFat.fatMass} ${wUnit}  |  Lean Mass: ${dashboard.bodyFat.leanMass} ${wUnit}`)
    nl(2)
  }

  // Section 2: AI Plan
  if (aiPlan) {
    checkPage(20); divider()
    h1('AI Health Plan', [22, 101, 52])
    body(`Goal: ${aiPlan.goalLabel}`)
    body(aiPlan.summary); nl(3)
    if (aiPlan.timeline.weeksToGoal > 0) {
      body(`Timeline: ${aiPlan.timeline.weeksToGoal} weeks  |  Weekly change: ${aiPlan.timeline.weeklyChange} ${wUnit}/week  |  Target: ${aiPlan.timeline.targetWeight} ${wUnit}`)
      nl(2)
    }
    checkPage(30); divider(); h2('Diet Recommendations')
    const diet = aiPlan.dietOptions[0]
    h3(`${diet.name} - ${diet.tag}`, [22, 101, 52])
    body(diet.description)
    body(`Daily calories: ${diet.calories.toLocaleString()} kcal  |  Protein: ${diet.macros.protein}g  |  Carbs: ${diet.macros.carbs}g  |  Fat: ${diet.macros.fat}g`)
    nl(2); h3('Recommended Foods')
    diet.foods.forEach(f => bullet(f)); nl(2)
    h3('Limit / Avoid', [185, 28, 28])
    diet.avoid.forEach(f => bullet(f)); nl(2)
    checkPage(20); h3('All Diet Options')
    aiPlan.dietOptions.forEach(d => body(`${d.name}: ${d.calories.toLocaleString()} kcal  |  P: ${d.macros.protein}g  C: ${d.macros.carbs}g  F: ${d.macros.fat}g  (${d.tag})`, 3))
    nl(3)
    checkPage(30); divider(); h2('Weekly Exercise Schedule')
    aiPlan.exerciseRoutine.forEach(day => {
      checkPage(10)
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(clean(day.rest ? `${day.day} - Rest Day` : `${day.day} - ${day.type} (${day.intensity}, ${day.duration})`), col, y); nl(5)
      day.exercises.forEach(ex => bullet(ex)); nl(2)
    })
    checkPage(20); divider(); h2('Daily Habits & Tips')
    aiPlan.habits.forEach(h => bullet(h))
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(245, 245, 247); doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 150)
    doc.text('mybmi.ai · For informational purposes only. Not a substitute for professional medical advice.', col, 291)
    doc.text(`Page ${i} of ${totalPages}`, W - margin, 291, { align: 'right' })
  }
  doc.save(`mybmi-health-report-${new Date().toISOString().split('T')[0]}.pdf`)
}
