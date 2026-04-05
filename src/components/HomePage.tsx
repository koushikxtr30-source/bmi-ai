import React from 'react'
import type { User } from 'firebase/auth'
import { ChevronRight, CheckCircle2, BarChart2, TrendingUp, Flame, Zap, Activity, Target, Sparkles } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts'
import type { Dashboard, UnitSystem, CheckIn, AIPlan } from '@/types'
import type { UserProfile } from '@/types'

export function HomePage({ dashboard, unitSystem, checkIns, profile, onNewCheckin, onOpenDashboard, onViewProgress, onEditProfile, aiPlan, user, onAiPlan, onViewPlan }: {
  dashboard: Dashboard; unitSystem: UnitSystem
  checkIns: CheckIn[]; profile: UserProfile | null
  onNewCheckin: () => void; onOpenDashboard: () => void
  onViewProgress: () => void; onEditProfile: () => void
  aiPlan: AIPlan | null; user: User | null; onAiPlan: () => void; onViewPlan: () => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const name = profile?.name && profile.name !== 'there' ? profile.name : null
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = new Date().toDateString()
  const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null
  const checkedInToday = lastCheckIn ? new Date(lastCheckIn.date).toDateString() === todayStr : false
  const trendData = checkIns.slice(-6).map(c => ({
    date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: parseFloat(c.inputs.weight) || null,
    bmi: c.dashboard.bmi?.bmi ?? null,
  }))
  const wDelta = checkIns.length >= 2 ? parseFloat(checkIns[checkIns.length-1].inputs.weight) - parseFloat(checkIns[checkIns.length-2].inputs.weight) : null
  const bmiDelta = checkIns.length >= 2 && checkIns[checkIns.length-1].dashboard.bmi && checkIns[checkIns.length-2].dashboard.bmi
    ? checkIns[checkIns.length-1].dashboard.bmi!.bmi - checkIns[checkIns.length-2].dashboard.bmi!.bmi : null
  const metrics = [
    { label: 'BMI', value: dashboard.bmi ? `${dashboard.bmi.bmi}` : '—', sub: dashboard.bmi?.label ?? '', color: dashboard.bmi?.color },
    { label: 'BMR', value: dashboard.bmr ? `${dashboard.bmr.bmr.toLocaleString()}` : '—', sub: dashboard.bmr ? 'kcal' : 'needs age', color: 'hsl(200 80% 55%)' },
    { label: 'TDEE', value: dashboard.tdee ? `${dashboard.tdee.tdee.toLocaleString()}` : '—', sub: dashboard.tdee ? 'kcal' : 'needs age', color: 'hsl(35 95% 55%)' },
    { label: 'Body Fat', value: dashboard.bodyFat ? `${dashboard.bodyFat.bodyFat}%` : '—', sub: dashboard.bodyFat?.category ?? 'skipped', color: dashboard.bodyFat?.color },
  ]

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{timeGreeting}{name ? `, ${name}` : ''}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {checkedInToday
              ? `Checked in · ${new Date(lastCheckIn!.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
              : checkIns.length > 0
                ? `Last checked in · ${new Date(lastCheckIn!.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                : 'No check-ins yet'}
          </p>
        </div>
        <button onClick={onEditProfile} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary underline underline-offset-2 flex-shrink-0 mt-1">Edit profile</button>
      </div>

      {/* Check-in CTA */}
      {!checkedInToday && (
        <button onClick={onNewCheckin} className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all group shadow-md shadow-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Log today's check-in</p>
              <p className="text-xs text-primary-foreground/70">{checkIns.length === 0 ? 'Start tracking your progress' : `${checkIns.length} check-in${checkIns.length !== 1 ? 's' : ''} tracked so far`}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* Checked in today banner */}
      {checkedInToday && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-400">Checked in today</p>
            <p className="text-xs text-muted-foreground">
              {lastCheckIn?.inputs.weight} {wUnit}
              {wDelta !== null && <span className={`ml-2 font-medium ${wDelta < 0 ? 'text-green-400' : wDelta > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{wDelta > 0 ? '+' : ''}{wDelta.toFixed(1)} {wUnit} since last</span>}
            </p>
          </div>
          <button onClick={onNewCheckin} className="text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">Update</button>
        </div>
      )}

      {/* BMI hero + metric cards */}
      {dashboard.bmi && (
        <div className="space-y-3">
          <div className="rounded-2xl border p-5 flex items-center gap-5" style={{ borderColor: dashboard.bmi.color + '40', background: `linear-gradient(135deg, ${dashboard.bmi.color}15 0%, ${dashboard.bmi.color}05 100%)` }}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Body Mass Index</p>
              <p className="text-6xl font-black tracking-tight leading-none" style={{ color: dashboard.bmi.color }}>{dashboard.bmi.bmi}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: dashboard.bmi.color, borderColor: dashboard.bmi.color + '50', background: dashboard.bmi.color + '15' }}>{dashboard.bmi.label}</span>
                {bmiDelta !== null && <span className={`text-xs font-medium ${bmiDelta < 0 ? 'text-primary' : bmiDelta > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{bmiDelta > 0 ? '↑' : bmiDelta < 0 ? '↓' : '→'} {Math.abs(bmiDelta).toFixed(1)} since last</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Healthy weight</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{dashboard.bmi.idealWeightMin}–{dashboard.bmi.idealWeightMax}</p>
              <p className="text-[10px] text-muted-foreground">{wUnit}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {metrics.slice(1).map(m => (
              <div key={m.label} className="rounded-xl border border-border/50 p-3 text-center bg-card">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{m.label}</p>
                <p className="text-xl font-black leading-none" style={{ color: m.color ?? 'inherit' }}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 capitalize">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      {checkIns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black text-primary">{checkIns.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Check-ins</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black text-foreground">{Math.floor((Date.now() - new Date(checkIns[0].date).getTime()) / 86400000)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Days tracking</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className="text-2xl font-black" style={{ color: wDelta !== null && wDelta < 0 ? 'hsl(var(--primary))' : wDelta !== null && wDelta > 0 ? 'hsl(35 95% 55%)' : 'hsl(var(--muted-foreground))' }}>
              {wDelta !== null ? `${wDelta > 0 ? '+' : ''}${wDelta.toFixed(1)}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{wUnit} change</p>
          </div>
        </div>
      )}

      {/* Weight trend sparkline */}
      {trendData.length >= 2 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div><p className="text-xs font-semibold">Weight trend</p><p className="text-[10px] text-muted-foreground">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</p></div>
            <button onClick={onViewProgress} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">Full history <ChevronRight className="w-3 h-3" /></button>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (<div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-xl text-xs"><p className="text-muted-foreground">{payload[0]?.payload?.date}</p><p className="font-semibold text-primary">{payload[0]?.value} {wUnit}</p></div>)
              }} />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Smart Insights */}
      {dashboard.bmi && (() => {
        const b = dashboard.bmi!
        type Insight = { icon: React.ReactNode; text: string; color: string }
        const insights: Insight[] = []
        const iconCls = 'w-4 h-4 flex-shrink-0 mt-0.5'

        if (b.category === 'obese' || b.category === 'overweight') {
          insights.push({ icon: <Target className={`${iconCls} text-orange-400`} />, text: `Your goal weight is ${b.idealWeightMax} ${wUnit}. A 500 kcal/day deficit gets you there.`, color: 'text-orange-400' })
        } else if (b.category === 'normal') {
          insights.push({ icon: <CheckCircle2 className={`${iconCls} text-primary`} />, text: `Your BMI is in the healthy range. Focus on maintaining with consistent check-ins.`, color: 'text-primary' })
        } else if (b.category === 'underweight') {
          insights.push({ icon: <Zap className={`${iconCls} text-blue-400`} />, text: `You're below healthy weight. Consider a calorie surplus to reach ${b.idealWeightMin} ${wUnit}.`, color: 'text-blue-400' })
        }
        if (dashboard.tdee) {
          const t = dashboard.tdee
          if (b.category === 'obese' || b.category === 'overweight') {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Eating ${t.deficit.toLocaleString()} kcal/day creates a 500 kcal deficit — the sweet spot for fat loss.`, color: 'text-yellow-400' })
          } else if (b.category === 'underweight') {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Eating ${t.surplus.toLocaleString()} kcal/day gives you a 300 kcal surplus.`, color: 'text-yellow-400' })
          } else {
            insights.push({ icon: <Flame className={`${iconCls} text-yellow-400`} />, text: `You burn ~${t.tdee.toLocaleString()} kcal/day. Staying within 100–200 kcal of this helps you maintain your weight.`, color: 'text-yellow-400' })
          }
        }
        if (dashboard.bodyFat) {
          const bf = dashboard.bodyFat
          if (bf.category === 'Obese') insights.push({ icon: <Activity className={`${iconCls} text-red-400`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). Combining cardio with strength training accelerates fat loss while preserving muscle.`, color: 'text-red-400' })
          else if (bf.category === 'Average') insights.push({ icon: <Activity className={`${iconCls} text-orange-400`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). You have ${bf.leanMass} ${wUnit} of lean mass — protect it with adequate protein intake.`, color: 'text-orange-400' })
          else if (bf.category === 'Athletic' || bf.category === 'Fitness') insights.push({ icon: <Activity className={`${iconCls} text-primary`} />, text: `Your body fat is ${bf.bodyFat}% (${bf.category}). Great body composition — ${bf.leanMass} ${wUnit} lean mass. Focus on strength to maintain it.`, color: 'text-primary' })
        }
        if (dashboard.bmr) insights.push({ icon: <Zap className={`${iconCls} text-blue-400`} />, text: `Your body burns ${dashboard.bmr.bmr.toLocaleString()} kcal at complete rest. Building muscle increases this number over time.`, color: 'text-blue-400' })
        if (user && checkIns.length >= 2) {
          const first = parseFloat(checkIns[0].inputs.weight), last2 = parseFloat(checkIns[checkIns.length - 1].inputs.weight), diff = last2 - first
          const weeks = Math.max(1, Math.round((new Date(checkIns[checkIns.length-1].date).getTime() - new Date(checkIns[0].date).getTime()) / (1000*60*60*24*7)))
          if (Math.abs(diff) > 0.5) {
            const perWeek = Math.abs(diff / weeks).toFixed(1)
            if (diff > 0) insights.push({ icon: <TrendingUp className={`${iconCls} text-orange-400`} />, text: `You've gained ${Math.abs(diff).toFixed(1)} ${wUnit} over ${weeks} week${weeks > 1 ? 's' : ''} (~${perWeek} ${wUnit}/week). ${b.category === 'underweight' ? 'Great progress!' : 'Consider reviewing your calorie intake.'}`, color: 'text-orange-400' })
            else insights.push({ icon: <TrendingUp className={`${iconCls} text-primary`} />, text: `You've lost ${Math.abs(diff).toFixed(1)} ${wUnit} over ${weeks} week${weeks > 1 ? 's' : ''} (~${perWeek} ${wUnit}/week). ${(diff/weeks) < -1 ? 'Good pace — sustainable loss is 0.5–1 lb/week.' : 'Excellent sustainable pace!'}`, color: 'text-primary' })
          }
        }
        if (checkIns.length === 1) insights.push({ icon: <TrendingUp className={`${iconCls} text-muted-foreground`} />, text: `Log your second check-in to start seeing your progress trend.`, color: 'text-muted-foreground' })
        else if (user && checkIns.length >= 2) {
          const daysSince = Math.floor((Date.now() - new Date(checkIns[checkIns.length-1].date).getTime()) / (1000*60*60*24))
          if (daysSince >= 7) insights.push({ icon: <CheckCircle2 className={`${iconCls} text-muted-foreground`} />, text: `It's been ${daysSince} days since your last check-in. Regular check-ins give you more accurate trend data.`, color: 'text-muted-foreground' })
        }

        type AISuggestion = { text: string }
        const aiSuggestions: AISuggestion[] = []
        if (user && dashboard.bmi) {
          if (b.category === 'obese' || b.category === 'overweight') {
            aiSuggestions.push({ text: 'Start with a 10-minute walk after each meal — it reduces blood sugar spikes and burns an extra 100–150 kcal/day.' })
            aiSuggestions.push({ text: 'Swap liquid calories (soda, juice, alcohol) for water. This single change often eliminates 200–500 kcal/day.' })
            if (dashboard.bodyFat && dashboard.bodyFat.bodyFat > 25) aiSuggestions.push({ text: 'Prioritize protein at every meal (chicken, eggs, legumes). It keeps you fuller longer and preserves lean mass during weight loss.' })
          } else if (b.category === 'normal') {
            aiSuggestions.push({ text: "You're in a great spot. Focus on body recomposition — strength training 3x/week will improve how you look and feel even at the same weight." })
            aiSuggestions.push({ text: 'Track your protein intake for a week. Most people eating well still undereat protein, which affects energy and muscle maintenance.' })
          } else if (b.category === 'underweight') {
            aiSuggestions.push({ text: 'Add calorie-dense foods to every meal — nuts, avocado, olive oil. They add calories without making you feel overly full.' })
            aiSuggestions.push({ text: 'Resistance training 3x/week helps convert your calorie surplus into muscle rather than fat.' })
          }
          if (dashboard.bmr && dashboard.tdee && dashboard.tdee.tdee / dashboard.bmr.bmr < 1.4) {
            aiSuggestions.push({ text: 'Your activity level appears sedentary. Adding even light daily movement (walks, standing) significantly improves metabolic health.' })
          }
        }
        if (insights.length === 0) return null
        return (
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Smart Insights</p>
            <div className="space-y-2.5">{insights.map((ins, i) => (<div key={i} className="flex items-start gap-3">{ins.icon}<p className={`text-xs leading-relaxed ${ins.color}`}>{ins.text}</p></div>))}</div>
            {user && aiSuggestions.length > 0 && (<><div className="h-px bg-border/50" /><div className="space-y-1.5"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" />AI Suggestions</p><div className="space-y-2">{aiSuggestions.map((s, i) => (<div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10"><Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" /><p className="text-xs leading-relaxed text-foreground/80">{s.text}</p></div>))}</div></div></>)}
            {!user && (<div className="flex items-center gap-2 pt-1"><svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg><p className="text-xs text-muted-foreground">Sign in to unlock AI Suggestions personalized to your data</p></div>)}
          </div>
        )
      })()}

      {/* No data state */}
      {!dashboard.bmi && checkIns.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto"><BarChart2 className="w-8 h-8 text-primary/60" /></div>
          <div className="space-y-1"><p className="text-sm font-semibold">Nothing here yet</p><p className="text-xs text-muted-foreground max-w-xs mx-auto">Your metrics will appear here after your first check-in.</p></div>
        </div>
      )}

      {/* AI Health Plan button */}
      {checkIns.length > 0 && (
        <button onClick={aiPlan ? onViewPlan : onAiPlan}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all group shadow-sm overflow-hidden relative ${!aiPlan && user ? 'ai-plan-btn' : ''} ${aiPlan ? 'border-border/60 bg-card hover:border-border hover:bg-secondary/50' : user ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-card hover:bg-secondary/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${aiPlan ? 'bg-secondary' : 'bg-primary/10'}`}>
              {user ? <Sparkles className={`w-4 h-4 ${aiPlan ? 'text-muted-foreground' : 'text-primary'}`} /> : <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
            </div>
            <div className="text-left">
              {aiPlan ? (<><p className="text-sm font-semibold">Your AI Health Plan</p><p className="text-xs text-muted-foreground">Diet · Exercise · Timeline · {aiPlan.goalLabel}</p></>) :
               user ? (<><p className="text-sm font-semibold text-primary">Generate your AI Health Plan</p><p className="text-xs text-muted-foreground">Personalized diet & exercise based on your stats</p></>) :
               (<><p className="text-sm font-semibold">AI Health Plan</p><p className="text-xs text-muted-foreground">Sign in to unlock your personalized plan</p></>)}
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all group-hover:translate-x-0.5 ${aiPlan ? 'text-muted-foreground' : 'text-primary/60 group-hover:text-primary'}`} />
        </button>
      )}

      {/* View Dashboard link */}
      {dashboard.bmi && (
        <button onClick={onOpenDashboard} className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group shadow-sm overflow-hidden relative">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
          <div className="flex items-center gap-3 ml-2">
            <BarChart2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-left"><p className="text-sm font-semibold">View Full Dashboard</p><p className="text-xs text-muted-foreground">AI plan · PDF report · all metrics</p></div>
          </div>
          <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* Trust strip */}
      <div className="sm:hidden flex items-center justify-center gap-5 py-3 border-t border-border/30">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Local only</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />No account</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Free</span>
      </div>
    </div>
  )
}
