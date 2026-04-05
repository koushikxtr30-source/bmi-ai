import { ChevronRight, ChevronLeft, Scale, Ruler, Activity, Percent, X, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { SharedInputs, UnitSystem, ActivityLevel, Sex, UserProfile } from '@/types'

const ACTIVITY_LEVELS = [
  { value: 'sedentary'   as ActivityLevel, label: 'Sedentary',   multiplier: 1.2,   desc: 'Little or no exercise' },
  { value: 'light'       as ActivityLevel, label: 'Light',       multiplier: 1.375, desc: '1–3 days/week' },
  { value: 'moderate'    as ActivityLevel, label: 'Moderate',    multiplier: 1.55,  desc: '3–5 days/week' },
  { value: 'active'      as ActivityLevel, label: 'Active',      multiplier: 1.725, desc: '6–7 days/week' },
  { value: 'very_active' as ActivityLevel, label: 'Very Active', multiplier: 1.9,   desc: 'Hard training 2×/day' },
]

export function CheckinWizard({
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
  errors: Record<string, string>; onSetErrors: (e: Record<string, string>) => void
  unitSystem: UnitSystem; onUnitToggle: () => void
  activityLevel: ActivityLevel; onActivity: (a: ActivityLevel) => void
  neck: string; waist: string; hip: string
  onNeck: (v: string) => void; onWaist: (v: string) => void; onHip: (v: string) => void
  onComplete: (skipBodyFat: boolean) => void
  onCancel?: () => void
}) {
  const mUnit = unitSystem === 'metric' ? 'cm' : 'in'
  const iCls = (err?: string) => `h-12 text-base ${err ? 'border-destructive' : ''}`
  const OB_STEPS = ['Name', 'Weight', 'Height', 'About you', 'Activity', 'Body']
  const CI_STEPS = ['Weight', 'Activity', 'Body']
  const STEPS = mode === 'onboarding' ? OB_STEPS : CI_STEPS
  const totalSteps = STEPS.length

  const validateWeight = () => {
    const e: Record<string, string> = {}
    if (!parseFloat(inputs.weight) || parseFloat(inputs.weight) <= 0) e.weight = 'Enter a valid weight'
    onSetErrors(e); return Object.keys(e).length === 0
  }
  const validateHeight = () => {
    const e: Record<string, string> = {}
    if (unitSystem === 'metric') {
      if (!parseFloat(inputs.height) || parseFloat(inputs.height) <= 0) e.height = 'Enter a valid height'
    } else {
      if (((parseFloat(inputs.heightFt) || 0) * 12 + (parseFloat(inputs.heightIn) || 0)) <= 0) e.height = 'Enter a valid height'
    }
    onSetErrors(e); return Object.keys(e).length === 0
  }
  const validateAboutYou = () => {
    const e: Record<string, string> = {}
    if (inputs.age && (parseInt(inputs.age) < 1 || parseInt(inputs.age) > 120)) e.age = 'Enter a valid age (1–120)'
    onSetErrors(e); return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Step {step} of {totalSteps}</span>
          <span className="text-xs text-muted-foreground">{STEPS[step - 1]}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i + 1 < step ? 'bg-primary' : i + 1 === step ? 'bg-primary/60' : 'bg-border'}`} />
          ))}
        </div>
      </div>

      {mode === 'onboarding' && (<>
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
                <Input type="text" placeholder="e.g. Alex" value={name} onChange={e => onName?.(e.target.value)} className="h-12 text-base" autoFocus onKeyDown={e => e.key === 'Enter' && onStep(2)} />
                <p className="text-xs text-muted-foreground">Optional — skip if you prefer</p>
              </div>
              <div className="flex gap-3">
                {onCancel && <button onClick={onCancel} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><X className="w-4 h-4" /> Cancel</button>}
                <button onClick={() => onStep(2)} style={{ minHeight: '56px' }} className={`flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90 ${onCancel ? 'flex-[2]' : 'w-full'}`}>
                  {name.trim() ? `Nice to meet you, ${name.trim()}!` : 'Continue'} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}
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
                <Label className="flex items-center gap-2 text-sm font-medium"><Scale className="w-4 h-4 text-muted-foreground" />Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                <Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'} value={inputs.weight} onChange={e => onInput('weight', e.target.value)} onKeyDown={e => e.key === 'Enter' && validateWeight() && onStep(3)} className={iCls(errors.weight)} min="0" step="0.1" autoFocus />
                {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => onStep(1)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => validateWeight() && onStep(3)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">Next <ChevronRight className="w-5 h-5" /></button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 3 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Ruler className="w-6 h-6 text-primary" /></div>
              <CardTitle className="text-2xl font-bold">How tall are you?</CardTitle>
              <CardDescription className="text-sm mt-1">Combined with your weight to calculate BMI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium"><Ruler className="w-4 h-4 text-muted-foreground" />Height ({unitSystem === 'metric' ? 'cm' : 'ft / in'})</Label>
                {unitSystem === 'metric' ? (
                  <Input type="number" inputMode="decimal" placeholder="e.g. 175" value={inputs.height} onChange={e => onInput('height', e.target.value)} onKeyDown={e => e.key === 'Enter' && validateHeight() && onStep(4)} className={iCls(errors.height)} min="0" step="0.1" autoFocus />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Input type="number" inputMode="numeric" placeholder="Feet" value={inputs.heightFt} onChange={e => onInput('heightFt', e.target.value)} className={iCls(errors.height)} min="0" autoFocus /><span className="text-xs text-muted-foreground mt-1 block">Feet</span></div>
                    <div><Input type="number" inputMode="numeric" placeholder="Inches" value={inputs.heightIn} onChange={e => onInput('heightIn', e.target.value)} className={iCls(errors.height)} min="0" max="11" /><span className="text-xs text-muted-foreground mt-1 block">Inches</span></div>
                  </div>
                )}
                {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => onStep(2)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => validateHeight() && onStep(4)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">Next <ChevronRight className="w-5 h-5" /></button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 4 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg></div>
              <CardTitle className="text-2xl font-bold">A bit about you</CardTitle>
              <CardDescription className="text-sm mt-1">Used to calculate BMR and TDEE — your daily calorie needs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">Age<span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">needed for BMR & TDEE</span></Label>
                <Input type="number" inputMode="numeric" placeholder="e.g. 28" value={inputs.age} onChange={e => onInput('age', e.target.value)} className={iCls(errors.age)} min="1" max="120" autoFocus />
                {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
                <p className="text-xs text-muted-foreground">Optional — skip to calculate BMI only</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Biological sex</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as Sex[]).map(s => (
                    <button key={s} onClick={() => onInput('sex', s)} className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all ${inputs.sex === s ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-border/80 hover:bg-secondary/30'}`}>
                      {s === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Used for body fat calculation</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => onStep(3)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => { if (validateAboutYou()) onStep(5) }} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90">Next <ChevronRight className="w-5 h-5" /></button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 5 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-primary" /></div>
              <CardTitle className="text-2xl font-bold">How active are you?</CardTitle>
              <CardDescription className="text-sm mt-1">Used to calculate total daily calorie needs (TDEE).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.value} onClick={() => onActivity(a.value)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${activityLevel === a.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-secondary/30'}`}>
                  <div><p className="font-semibold text-sm">{a.label}</p><p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p></div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activityLevel === a.value ? 'border-primary' : 'border-muted-foreground/30'}`}>
                    {activityLevel === a.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </button>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => onStep(4)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => onStep(6)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">Next — Body Measurements <ChevronRight className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 6 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Percent className="w-6 h-6 text-primary" /></div>
              <CardTitle className="text-2xl font-bold">Body measurements</CardTitle>
              <CardDescription className="text-sm mt-1">Optional — unlocks Body Fat % calculation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2.5">All in <strong>{mUnit}</strong>. Measure at the narrowest point with a soft tape measure.</p>
              <div className="space-y-2"><Label className="text-sm font-medium">Neck circumference ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 37' : 'e.g. 14.5'} value={neck} onChange={e => onNeck(e.target.value)} className={iCls(errors.neck)} min="0" step="0.1" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Waist circumference ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 80' : 'e.g. 32'} value={waist} onChange={e => onWaist(e.target.value)} className={iCls(errors.waist)} min="0" step="0.1" /></div>
              {inputs.sex === 'female' && <div className="space-y-2"><Label className="text-sm font-medium">Hip circumference ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 95' : 'e.g. 37'} value={hip} onChange={e => onHip(e.target.value)} className={iCls(errors.hip)} min="0" step="0.1" /></div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => onStep(5)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => onComplete(false)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">See my results <ChevronRight className="w-4 h-4" /></button>
              </div>
              <button onClick={() => onComplete(true)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 underline underline-offset-2">Skip body measurements</button>
            </CardContent>
          </Card>
        )}
      </>)}

      {mode === 'checkin' && (<>
        {step === 1 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Today's check-in</CardTitle>
              <CardDescription>Log your current weight to track progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {profile && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/50">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-primary">{profile.sex === 'male' ? 'M' : 'F'}</span></div>
                  <div className="text-xs text-muted-foreground flex-1">
                    <span className="font-semibold text-foreground">{profile.unitSystem === 'imperial' ? `${profile.heightFt}'${profile.heightIn}"` : `${profile.height} cm`}</span>
                    {profile.age && <span> · {profile.age}y</span>}<span> · {profile.sex}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">from profile</span>
                </div>
              )}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium"><Scale className="w-4 h-4 text-muted-foreground" />Weight ({profile?.unitSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                <Input type="number" inputMode="decimal" placeholder={profile?.unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'} value={inputs.weight} onChange={e => onInput('weight', e.target.value)} className={`h-12 text-base ${errors.weight ? 'border-destructive' : ''}`} min="0" step="0.1" autoFocus />
                {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
              </div>
              <div className="space-y-2">
                <button onClick={() => { const e: Record<string,string> = {}; if (!parseFloat(inputs.weight) || parseFloat(inputs.weight) <= 0) e.weight = 'Enter a valid weight'; onSetErrors(e); if (!Object.keys(e).length) onComplete(true) }} style={{ minHeight: '56px' }} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-base font-semibold transition-all hover:bg-primary/90 shadow-md shadow-primary/20">
                  <CheckCircle2 className="w-5 h-5" /> Save check-in
                </button>
                <div className="flex gap-2">
                  {onCancel && <button onClick={onCancel} style={{ minHeight: '44px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /> Cancel</button>}
                  <button onClick={() => { const e: Record<string,string> = {}; if (!parseFloat(inputs.weight) || parseFloat(inputs.weight) <= 0) e.weight = 'Enter a valid weight'; onSetErrors(e); if (!Object.keys(e).length) onStep(2) }} style={{ minHeight: '44px' }} className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                    Also update activity / body <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 2 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4"><CardTitle className="text-xl flex items-center gap-2"><Activity className="w-5 h-5" />Activity level</CardTitle><CardDescription>Update if it's changed since last time.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.value} onClick={() => onActivity(a.value)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${activityLevel === a.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-secondary/30'}`}>
                  <div><p className="font-semibold text-sm">{a.label}</p><p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p></div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activityLevel === a.value ? 'border-primary' : 'border-muted-foreground/30'}`}>{activityLevel === a.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}</div>
                </button>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => onStep(1)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => onStep(3)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">Next — Body Measurements <ChevronRight className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 3 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4"><CardTitle className="text-xl flex items-center gap-2"><Percent className="w-5 h-5" />Body measurements</CardTitle><CardDescription>Optional — skip if you don't have a tape measure handy.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2.5">All in <strong>{mUnit}</strong>. Measure at the narrowest point.</p>
              <div className="space-y-2"><Label className="text-sm font-medium">Neck ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 37' : 'e.g. 14.5'} value={neck} onChange={e => onNeck(e.target.value)} className={iCls(errors.neck)} min="0" step="0.1" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium">Waist ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 80' : 'e.g. 32'} value={waist} onChange={e => onWaist(e.target.value)} className={iCls(errors.waist)} min="0" step="0.1" /></div>
              {(inputs.sex === 'female' || profile?.sex === 'female') && <div className="space-y-2"><Label className="text-sm font-medium">Hip ({mUnit})</Label><Input type="number" inputMode="decimal" placeholder={unitSystem === 'metric' ? 'e.g. 95' : 'e.g. 37'} value={hip} onChange={e => onHip(e.target.value)} className={iCls(errors.hip)} min="0" step="0.1" /></div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => onStep(2)} style={{ minHeight: '52px' }} className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => onComplete(false)} style={{ minHeight: '52px' }} className="flex-[2] flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90">Save check-in <ChevronRight className="w-4 h-4" /></button>
              </div>
              <button onClick={() => onComplete(true)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 underline underline-offset-2">Skip body measurements</button>
            </CardContent>
          </Card>
        )}
      </>)}
    </div>
  )
}
