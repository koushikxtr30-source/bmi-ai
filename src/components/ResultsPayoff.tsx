import { ChevronRight, Info, Sparkles } from 'lucide-react'
import { ArcGauge } from '@/components/ArcGauge'
import type { Dashboard, UnitSystem } from '@/types'

const BMI_SEGMENTS = [
  { from: -180, to: -135, color: 'hsl(200 80% 55%)' },
  { from: -135, to: -54,  color: 'hsl(142 76% 45%)' },
  { from: -54,  to: -18,  color: 'hsl(35 95% 55%)' },
  { from: -18,  to: 0,    color: 'hsl(0 84% 60%)' },
]

export function ResultsPayoff({ dashboard, unitSystem, name, onContinue }: {
  dashboard: Dashboard; unitSystem: UnitSystem; name: string; onContinue: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const greeting = name && name !== 'there' ? name : null
  return (
    <div className="space-y-6 animate-fade-in-up">
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
