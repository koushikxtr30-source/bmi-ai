import { useState } from 'react'
import { ChevronLeft, TrendingUp, Trash2, Info } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CheckIn, UnitSystem } from '@/types'

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
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>{p.value}{unit}</p>
      ))}
    </div>
  )
}

export function ProgressPage({ checkIns, unitSystem, onClear, onBack }: {
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
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />{title}
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
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} connectNulls />
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
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
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
        <button onClick={onBack} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Start first check-in
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl font-bold">Progress</h2>
            <p className="text-xs text-muted-foreground">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />Clear all
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Are you sure?</span>
            <button onClick={() => { onClear(); setConfirmClear(false) }} className="text-xs text-destructive font-semibold px-2 py-1 rounded hover:bg-destructive/10">Yes, clear</button>
            <button onClick={() => setConfirmClear(false)} className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-secondary">Cancel</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Check-ins" value={String(checkIns.length)} sub="total" />
        <StatCard label="Weight change" value={wChange !== null ? `${wChange > 0 ? '+' : ''}${wChange.toFixed(1)} ${wUnit}` : '—'} sub={wChange !== null ? (wChange < 0 ? 'lost 🎉' : wChange > 0 ? 'gained' : 'same') : 'need 2+'} color={wChange !== null ? (wChange < 0 ? '#22c55e' : wChange > 0 ? '#f97316' : undefined) : undefined} />
        <StatCard label="BMI change" value={bmiChange !== null ? `${bmiChange > 0 ? '+' : ''}${bmiChange.toFixed(1)}` : '—'} sub={bmiChange !== null ? (bmiChange < 0 ? 'improving ⬇' : bmiChange > 0 ? 'increasing ⬆' : 'stable') : 'need 2+'} color={bmiChange !== null ? (bmiChange < 0 ? '#22c55e' : bmiChange > 0 ? '#f97316' : undefined) : undefined} />
        <StatCard label="Latest BMI" value={bmiLast ? String(bmiLast) : '—'} sub={last?.dashboard.bmi?.label ?? ''} color={last?.dashboard.bmi?.color} />
      </div>

      <ChartCard title={`Weight (${wUnit})`} dataKey="weight"  unit={` ${wUnit}`} color={CHART_COLORS.weight} />
      <ChartCard title="BMI"               dataKey="bmi"     unit=""           color={CHART_COLORS.bmi} />
      <ChartCard title="Body Fat %"        dataKey="bodyfat" unit="%"          color={CHART_COLORS.bodyfat} />
      <ChartCard title="TDEE (kcal/day)"   dataKey="tdee"    unit=" kcal"      color={CHART_COLORS.tdee} />

      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Check-in History</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {[...checkIns].reverse().map((c, i) => (
            <div key={c.id} className={`flex items-center justify-between py-2.5 ${i < checkIns.length - 1 ? 'border-b border-border/30' : ''}`}>
              <div>
                <p className="text-xs font-semibold">{new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.inputs.weight} {c.unitSystem === 'metric' ? 'kg' : 'lbs'}{c.inputs.age ? ` · Age ${c.inputs.age}` : ''}{' · '}{c.inputs.sex}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                {c.dashboard.bmi && <div><p className="text-[10px] text-muted-foreground">BMI</p><p className="text-xs font-bold" style={{ color: c.dashboard.bmi.color }}>{c.dashboard.bmi.bmi}</p></div>}
                {c.dashboard.bodyFat && <div><p className="text-[10px] text-muted-foreground">Body Fat</p><p className="text-xs font-bold" style={{ color: c.dashboard.bodyFat.color }}>{c.dashboard.bodyFat.bodyFat}%</p></div>}
                {c.dashboard.tdee && <div><p className="text-[10px] text-muted-foreground">TDEE</p><p className="text-xs font-bold text-yellow-400">{c.dashboard.tdee.tdee.toLocaleString()}</p></div>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="text-center pb-2">
        <p className="text-xs text-muted-foreground"><Info className="w-3 h-3 inline mr-1" />Data stored locally on this device only.</p>
      </div>
    </div>
  )
}
