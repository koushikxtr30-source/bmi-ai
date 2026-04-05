import { ChevronLeft, ChevronRight, Flame, Zap, BarChart2, Sparkles, Info } from 'lucide-react'
import { ArcGauge } from '@/components/ArcGauge'
import { AIPlanSection } from '@/components/AIPlanSection'
import { Separator } from '@/components/ui/separator'
import type { Dashboard, UnitSystem, AIPlan, SharedInputs, ActivityLevel } from '@/types'

const BMI_SEGMENTS = [
  { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
  { from: -135, to: -54,  color: 'hsl(142 76% 45%)' },
  { from: -54,  to: -18,  color: 'hsl(35 95% 55%)' },
  { from: -18,  to: 0,    color: 'hsl(0 84% 60%)' },
]

export function DashboardPage({ dashboard, unitSystem, aiPlan, onGeneratePlan, inputs, activityLevel, onDownloadPDF, onBack, onNewCheckin }: {
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
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl font-bold">Dashboard</h2>
            <p className="text-xs text-muted-foreground">{[dashboard.bmi, dashboard.bmr, dashboard.tdee, dashboard.bodyFat].filter(Boolean).length} metrics</p>
          </div>
        </div>
        <button onClick={onNewCheckin} className="flex items-center gap-1.5 px-4 h-9 rounded-md text-sm font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-lg transition-all duration-200 active:scale-[0.97]">
          + Check-in
        </button>
      </div>

      {!hasAny && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto"><BarChart2 className="w-8 h-8 text-primary/60" /></div>
          <div className="space-y-1"><p className="text-base font-bold">No data yet</p><p className="text-xs text-muted-foreground">Complete a check-in to populate your dashboard.</p></div>
        </div>
      )}

      {dashboard.bmi && (() => { const r = dashboard.bmi!; return (
        <div className="card-hero rounded-2xl border p-6 space-y-4" style={{ borderColor: r.color + '40', background: `linear-gradient(145deg, ${r.color}18 0%, ${r.color}08 100%)` }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Body Mass Index</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ color: r.color, borderColor: r.color + '60', background: r.color + '18' }}>{r.label}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-48 flex-shrink-0"><ArcGauge value={r.bmi} min={10} max={40} color={r.color} segments={BMI_SEGMENTS} /></div>
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <p className="text-7xl font-black tracking-tight leading-none" style={{ color: r.color }}>{r.bmi}</p>
                <p className="text-sm text-muted-foreground mt-1">out of 40 max</p>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-6">
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy range</p><p className="text-sm font-bold text-foreground mt-0.5">{r.idealWeightMin}–{r.idealWeightMax} {wUnit}</p></div>
                <div className="w-px h-8 bg-border/50" />
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p><p className="text-sm font-bold mt-0.5" style={{ color: r.color }}>{r.label}</p></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4" style={{ borderColor: r.color + '25' }}>{r.tip}</p>
        </div>
      )})()}

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
                <div className="text-center"><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Lose</p><p className="text-xs font-bold text-primary mt-0.5">{dashboard.tdee.deficit.toLocaleString()}</p></div>
                <div className="text-center border-x border-border/30"><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Maintain</p><p className="text-xs font-bold text-blue-400 mt-0.5">{dashboard.tdee.tdee.toLocaleString()}</p></div>
                <div className="text-center"><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Gain</p><p className="text-xs font-bold text-purple-400 mt-0.5">{dashboard.tdee.surplus.toLocaleString()}</p></div>
              </div>
            </div>
          )}
        </div>
      )}

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
            <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fat Mass</p><p className="text-lg font-bold mt-1">{r.fatMass} <span className="text-xs font-normal text-muted-foreground">{wUnit}</span></p></div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lean Mass</p><p className="text-lg font-bold mt-1">{r.leanMass} <span className="text-xs font-normal text-muted-foreground">{wUnit}</span></p></div>
          </div>
        </div>
      )})()}

      {dashboard.bmi && (
        <><Separator />
          {!aiPlan ? (
            <button onClick={onGeneratePlan} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-primary/60 bg-primary/12 transition-all group relative overflow-hidden ai-plan-btn">
              <div className="flex items-center gap-3 relative">
                <div className="w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center transition-colors"><Sparkles className="w-5 h-5 text-primary" /></div>
                <div className="text-left"><p className="text-sm font-semibold text-primary">Get Your AI Health Plan</p><p className="text-xs text-muted-foreground">Diet · Exercise · Goal timeline</p></div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/70 transition-all relative" />
            </button>
          ) : <AIPlanSection plan={aiPlan} unitSystem={unitSystem} />}
        </>
      )}

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
