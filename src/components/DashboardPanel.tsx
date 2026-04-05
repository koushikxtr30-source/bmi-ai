import { useState, useEffect } from 'react'
import { ChevronRight, Flame, Zap, BarChart2, Sparkles, X, TrendingUp, Maximize2, Minimize2 } from 'lucide-react'
import { ArcGauge } from '@/components/ArcGauge'
import { AIPlanSection } from '@/components/AIPlanSection'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Dashboard, UnitSystem, AIPlan, SharedInputs, ActivityLevel } from '@/types'

const BMI_SEGMENTS = [
  { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
  { from: -135, to: -54,  color: 'hsl(142 76% 45%)' },
  { from: -54,  to: -18,  color: 'hsl(35 95% 55%)' },
  { from: -18,  to: 0,    color: 'hsl(0 84% 60%)' },
]

export function DashboardPanel({ dashboard, open, onClose, unitSystem, aiPlan, onGeneratePlan, inputs, activityLevel, onDownloadPDF }: {
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
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={[
        'fixed bg-card z-50 overflow-y-auto transition-all duration-300 ease-in-out',
        'inset-x-0 bottom-0 rounded-t-2xl max-h-[93dvh]',
        'sm:inset-y-0 sm:left-auto sm:right-0 sm:rounded-none sm:max-h-full sm:border-l sm:border-border',
        expanded ? 'sm:w-full' : 'sm:w-[440px]',
        open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
      ].join(' ')}>
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2"><BarChart2 className="w-5 h-5" /><span className="font-semibold text-base">Your Dashboard</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="hidden sm:flex p-1.5 rounded-md hover:bg-secondary transition-colors">
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!hasAny && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto"><BarChart2 className="w-8 h-8 text-primary/60" /></div>
              <div className="space-y-1"><p className="text-base font-bold">Nothing to show</p><p className="text-xs text-muted-foreground">Complete a check-in to see your metrics here.</p></div>
            </div>
          )}

          {dashboard.bmi && (() => { const r = dashboard.bmi!; return (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: r.color + '55', background: r.color + '11' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">BMI</span>
                <Badge variant="outline" style={{ color: r.color, borderColor: r.color }}>{r.label}</Badge>
              </div>
              <ArcGauge value={r.bmi} min={10} max={40} color={r.color} segments={BMI_SEGMENTS} />
              <div className="flex justify-between items-end">
                <div><p className="text-3xl font-bold" style={{ color: r.color }}>{r.bmi}</p><p className="text-xs text-muted-foreground mt-0.5">Body Mass Index</p></div>
                <div className="text-right text-xs text-muted-foreground"><p>Healthy range</p><p className="font-semibold text-foreground">{r.idealWeightMin}–{r.idealWeightMax} {wUnit}</p></div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{r.tip}</p>
            </div>
          )})()}

          {dashboard.bmr && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">BMR</span><Flame className="w-4 h-4 text-orange-400" /></div>
              <p className="text-3xl font-bold text-orange-400">{dashboard.bmr.bmr.toLocaleString()} <span className="text-base font-normal text-muted-foreground">kcal/day</span></p>
              <p className="text-xs text-muted-foreground">Calories at rest · {dashboard.bmr.formula} formula</p>
              <div className="bg-secondary/50 rounded-lg p-3 text-xs"><p className="font-medium mb-1">What this means</p><p className="text-muted-foreground">Even lying still all day, your body burns {dashboard.bmr.bmr.toLocaleString()} kcal.</p></div>
            </div>
          )}

          {dashboard.tdee && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">TDEE</span><Zap className="w-4 h-4 text-yellow-400" /></div>
              <p className="text-3xl font-bold text-yellow-400">{dashboard.tdee.tdee.toLocaleString()} <span className="text-base font-normal text-muted-foreground">kcal/day</span></p>
              <p className="text-xs text-muted-foreground">At <span className="text-foreground">{dashboard.tdee.activityLabel}</span> activity level.</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Weight Loss</p><p className="text-sm font-bold text-green-400">{dashboard.tdee.deficit.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">kcal/day</p></div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Maintain</p><p className="text-sm font-bold text-blue-400">{dashboard.tdee.tdee.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">kcal/day</p></div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Weight Gain</p><p className="text-sm font-bold text-purple-400">{dashboard.tdee.surplus.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">kcal/day</p></div>
              </div>
            </div>
          )}

          {dashboard.bodyFat && (() => { const r = dashboard.bodyFat!; return (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Body Fat</span><Badge variant="outline" style={{ color: r.color, borderColor: r.color }}>{r.category}</Badge></div>
              <p className="text-3xl font-bold" style={{ color: r.color }}>{r.bodyFat}%</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">Fat Mass</p><p className="text-sm font-bold">{r.fatMass} {wUnit}</p></div>
                <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="text-xs text-muted-foreground">Lean Mass</p><p className="text-sm font-bold">{r.leanMass} {wUnit}</p></div>
              </div>
            </div>
          )})()}

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

          {hasAny && (<><Separator />
            <button onClick={onDownloadPDF} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-gradient-to-r hover:from-emerald-500/15 hover:to-cyan-500/10 hover:border-emerald-400/60 transition-all duration-300 group shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2M7 10V7a5 5 0 0110 0v3" /></svg>
                </div>
                <div className="text-left"><p className="text-sm font-semibold text-primary">Download Health Report</p><p className="text-xs text-muted-foreground">PDF · All metrics{aiPlan ? ' + AI plan' : ''} · Free</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
            </button>
          </>)}

          {canGeneratePlan && (<><Separator />
            {!aiPlan ? (
              <button onClick={onGeneratePlan} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-primary/60 bg-primary/12 transition-all group overflow-hidden relative ai-plan-btn">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
                  <div className="text-left"><p className="text-sm font-semibold text-primary">Get Your AI Health Plan</p><p className="text-xs text-muted-foreground">Diet · Exercise · Goal timeline</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/70" />
              </button>
            ) : <AIPlanSection plan={aiPlan} unitSystem={unitSystem} />}
          </>)}
        </div>
      </div>
    </>
  )
}
