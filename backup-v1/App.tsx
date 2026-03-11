import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { Calculator, Info, Moon, Sun, Scale, Ruler, Heart, Activity, Utensils, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type UnitSystem = 'metric' | 'imperial'
type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese' | null
type Sex = 'male' | 'female' | 'other'

interface BMIResult {
  value: number
  category: BMICategory
  label: string
  color: string
  tip: string
  icon: React.ReactNode
  idealWeightMin: number
  idealWeightMax: number
}

// BMI gauge arc component
function BMIGauge({ value, color }: { value: number; color: string }) {
  const min = 10
  const max = 40
  const clamped = Math.min(Math.max(value, min), max)
  const pct = (clamped - min) / (max - min) // 0 to 1

  const cx = 100
  const cy = 90
  const r = 70
  const startAngle = -180
  const endAngle = 0

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg))

  const segments = [
    { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
    { from: -135, to: -54, color: 'hsl(142 76% 45%)' },
    { from: -54, to: -18, color: 'hsl(35 95% 55%)' },
    { from: -18, to: 0, color: 'hsl(0 84% 60%)' },
  ]

  const needleAngle = startAngle + pct * (endAngle - startAngle)
  const needleX = cx + (r - 10) * Math.cos(toRad(needleAngle))
  const needleY = cy + (r - 10) * Math.sin(toRad(needleAngle))

  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => {
        const x1 = arcX(seg.from), y1 = arcY(seg.from)
        const x2 = arcX(seg.to), y2 = arcY(seg.to)
        const large = seg.to - seg.from > 180 ? 1 : 0
        return (
          <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={seg.color} strokeWidth="12" strokeLinecap="round" opacity="0.85" />
        )
      })}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
    </svg>
  )
}

function App() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')
  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [heightFt, setHeightFt] = useState<string>('')
  const [heightIn, setHeightIn] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const [sex, setSex] = useState<Sex>('other')
  const [result, setResult] = useState<BMIResult | null>(null)
  const [errors, setErrors] = useState<{ weight?: string; height?: string }>({})
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) { root.classList.add('dark'); root.classList.remove('light') }
    else { root.classList.remove('dark'); root.classList.add('light') }
  }, [isDark])

  const calculateBMI = useCallback(() => {
    const newErrors: { weight?: string; height?: string } = {}
    let bmiValue = 0, heightM = 0

    if (unitSystem === 'metric') {
      const weightKg = parseFloat(weight), heightCm = parseFloat(height)
      if (!weight || isNaN(weightKg) || weightKg <= 0) newErrors.weight = 'Please enter a valid weight'
      if (!height || isNaN(heightCm) || heightCm <= 0) newErrors.height = 'Please enter a valid height'
      if (Object.keys(newErrors).length === 0) { heightM = heightCm / 100; bmiValue = weightKg / (heightM * heightM) }
    } else {
      const weightLbs = parseFloat(weight), feet = parseFloat(heightFt) || 0, inches = parseFloat(heightIn) || 0
      const totalInches = feet * 12 + inches
      if (!weight || isNaN(weightLbs) || weightLbs <= 0) newErrors.weight = 'Please enter a valid weight'
      if (totalInches <= 0) newErrors.height = 'Please enter a valid height'
      if (Object.keys(newErrors).length === 0) { heightM = totalInches * 0.0254; bmiValue = (weightLbs / (totalInches * totalInches)) * 703 }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0 && bmiValue > 0) {
      let category: BMICategory = null, label = '', color = '', tip = '', icon: React.ReactNode = null
      const ageNum = parseInt(age) || 0, isSenior = ageNum >= 65, isYouth = ageNum > 0 && ageNum < 18

      if (bmiValue < 18.5) {
        category = 'underweight'; label = 'Underweight'; color = 'hsl(200 80% 55%)'
        tip = isYouth ? 'For younger individuals, consult a pediatrician — BMI ranges differ for children and teens.'
          : isSenior ? 'For older adults, being underweight can increase fracture risk. Speak with your doctor about nutrition.'
          : sex === 'female' ? 'Women may have different healthy weight ranges. Focus on nutrient-dense foods and consult a provider.'
          : 'Consider consulting a healthcare provider and focus on nutrient-dense foods to reach a healthy weight.'
        icon = <Utensils className="w-5 h-5" />
      } else if (bmiValue < 25) {
        category = 'normal'; label = 'Normal Weight'; color = 'hsl(142 76% 45%)'
        tip = isSenior ? 'Great! For older adults, maintaining this range supports bone density and energy levels.' : 'Great job! Maintain your healthy habits with regular exercise and balanced nutrition.'
        icon = <Heart className="w-5 h-5" />
      } else if (bmiValue < 30) {
        category = 'overweight'; label = 'Overweight'; color = 'hsl(35 95% 55%)'
        tip = isSenior ? 'For older adults, a slightly higher BMI may be acceptable. Discuss with your doctor.' : 'Consider a balanced diet and increased physical activity to reach a healthier weight.'
        icon = <Activity className="w-5 h-5" />
      } else {
        category = 'obese'; label = 'Obese'; color = 'hsl(0 84% 60%)'
        tip = 'We recommend seeking professional medical guidance for a personalized weight management plan.'
        icon = <Stethoscope className="w-5 h-5" />
      }

      const idealWeightMinKg = 18.5 * heightM * heightM, idealWeightMaxKg = 24.9 * heightM * heightM
      const idealWeightMin = unitSystem === 'metric' ? Math.round(idealWeightMinKg * 10) / 10 : Math.round(idealWeightMinKg * 2.205 * 10) / 10
      const idealWeightMax = unitSystem === 'metric' ? Math.round(idealWeightMaxKg * 10) / 10 : Math.round(idealWeightMaxKg * 2.205 * 10) / 10

      setResult({ value: Math.round(bmiValue * 10) / 10, category, label, color, tip, icon, idealWeightMin, idealWeightMax })
    } else { setResult(null) }
  }, [unitSystem, weight, height, heightFt, heightIn, age, sex])

  const handleReset = () => { setWeight(''); setHeight(''); setHeightFt(''); setHeightIn(''); setResult(null); setErrors({}) }
  const handleUnitToggle = () => { setUnitSystem(prev => prev === 'metric' ? 'imperial' : 'metric'); handleReset() }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Enter') calculateBMI() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [calculateBMI])

  const getCategoryGradient = (category: BMICategory) => {
    switch (category) {
      case 'underweight': return 'bmi-gradient-underweight'
      case 'normal': return 'bmi-gradient-normal'
      case 'overweight': return 'bmi-gradient-overweight'
      case 'obese': return 'bmi-gradient-obese'
      default: return ''
    }
  }

  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lbs'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Calculator className="w-5 h-5" />
                <span className="font-semibold text-sm">mybmi.ai</span>
              </a>
              <span className="text-muted-foreground text-sm">BMI Calculator</span>
            </div>
            <nav className="flex items-center gap-4">
              <a href="https://bsmawrt.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">bsmawrt.com</a>
              <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-md hover:bg-secondary transition-colors" aria-label="Toggle theme">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />Live</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">BMI Calculator</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">Calculate your Body Mass Index instantly. Get personalized health insights based on your results.</p>
          </div>
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Scale className="w-5 h-5" />Calculate Your BMI</CardTitle>
                  <CardDescription className="mt-1">Enter your details below to get started</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${unitSystem === 'metric' ? 'text-foreground' : 'text-muted-foreground'}`}>Metric</span>
                  <Switch checked={unitSystem === 'imperial'} onCheckedChange={handleUnitToggle} />
                  <span className={`text-sm ${unitSystem === 'imperial' ? 'text-foreground' : 'text-muted-foreground'}`}>Imperial</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="flex items-center gap-2"><Scale className="w-4 h-4 text-muted-foreground" />Weight ({weightUnit})</Label>
                  <Input id="weight" type="number" placeholder={`Enter weight in ${unitSystem === 'metric' ? 'kilograms' : 'pounds'}`} value={weight} onChange={(e) => setWeight(e.target.value)} className={`h-11 ${errors.weight ? 'border-destructive' : ''}`} min="0" step="0.1" />
                  {errors.weight && <p className="text-sm text-destructive">{errors.weight}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Ruler className="w-4 h-4 text-muted-foreground" />Height ({unitSystem === 'metric' ? 'cm' : 'ft/in'})</Label>
                  {unitSystem === 'metric' ? (
                    <Input type="number" placeholder="Enter height in centimeters" value={height} onChange={(e) => setHeight(e.target.value)} className={`h-11 ${errors.height ? 'border-destructive' : ''}`} min="0" step="0.1" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Input type="number" placeholder="Feet" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className={`h-11 ${errors.height ? 'border-destructive' : ''}`} min="0" /><span className="text-xs text-muted-foreground mt-1 block">Feet</span></div>
                      <div><Input type="number" placeholder="Inches" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className={`h-11 ${errors.height ? 'border-destructive' : ''}`} min="0" max="11" /><span className="text-xs text-muted-foreground mt-1 block">Inches</span></div>
                    </div>
                  )}
                  {errors.height && <p className="text-sm text-destructive">{errors.height}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-sm">Age <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="age" type="number" placeholder="e.g. 30" value={age} onChange={(e) => setAge(e.target.value)} className="h-11" min="1" max="120" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Sex <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="flex gap-2 h-11 items-center">
                      {(['male', 'female', 'other'] as Sex[]).map(s => (
                        <button key={s} onClick={() => setSex(s)} className={`flex-1 h-9 rounded-md text-sm border transition-colors capitalize ${sex === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}>
                          {s === 'other' ? 'Other' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={calculateBMI} className="flex-1 h-11" size="lg"><Calculator className="w-4 h-4 mr-2" />Calculate BMI</Button>
                <Button variant="outline" onClick={handleReset} className="h-11 px-4">Reset</Button>
              </div>
              {result && (
                <div className={`animate-fade-in-up rounded-lg border p-5 ${getCategoryGradient(result.category)}`} style={{ borderColor: result.color }}>
                  <div className="mb-2"><BMIGauge value={result.value} color={result.color} /></div>
                  <div className="flex items-center justify-between mb-4">
                    <div><p className="text-sm text-muted-foreground mb-1">Your BMI</p><p className="text-4xl font-bold" style={{ color: result.color }}>{result.value}</p></div>
                    <Badge variant="outline" className="text-base px-3 py-1" style={{ borderColor: result.color, color: result.color }}>{result.label}</Badge>
                  </div>
                  <div className="mb-4 p-3 rounded-md bg-background/40 border border-border/40">
                    <p className="text-xs text-muted-foreground mb-1">Healthy weight range for your height</p>
                    <p className="text-sm font-semibold">{result.idealWeightMin} – {result.idealWeightMax} {weightUnit}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">(BMI 18.5 – 24.9)</p>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5" style={{ color: result.color }}>{result.icon}</div>
                    <div><p className="text-sm font-medium mb-1">Health Tip</p><p className="text-sm text-muted-foreground leading-relaxed">{result.tip}</p></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="mt-6 border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />BMI Categories</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { cls: 'bmi-gradient-underweight', label: 'Underweight', range: '< 18.5', color: 'hsl(200 80% 55%)' },
                  { cls: 'bmi-gradient-normal', label: 'Normal Weight', range: '18.5 – 24.9', color: 'hsl(142 76% 45%)' },
                  { cls: 'bmi-gradient-overweight', label: 'Overweight', range: '25 – 29.9', color: 'hsl(35 95% 55%)' },
                  { cls: 'bmi-gradient-obese', label: 'Obese', range: '≥ 30', color: 'hsl(0 84% 60%)' },
                ].map(cat => (
                  <div key={cat.label} className={`flex items-center justify-between p-3 rounded-md ${cat.cls}`} style={{ border: `1px solid ${cat.color}33` }}>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} /><span className="text-sm font-medium">{cat.label}</span></div>
                    <span className="text-sm text-muted-foreground">{cat.range}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground max-w-md mx-auto"><Info className="w-3 h-3 inline mr-1" />BMI is a screening tool, not a diagnostic of body fatness or health. Consult a healthcare provider for personalized advice.</p>
          </div>
        </div>
      </main>
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><span>© 2025 mybmi.ai</span><span>•</span><span>A bsmawrt.com tool</span></div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />No data storage</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Privacy focused</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
