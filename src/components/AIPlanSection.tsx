import { useState } from 'react'
import {
  Sparkles, Utensils, Dumbbell, Target, TrendingUp,
  ChevronDown, Clock, Apple, Leaf, CheckCircle2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AIPlan, UnitSystem } from '@/types'

export function AIPlanSection({ plan, unitSystem }: { plan: AIPlan; unitSystem: UnitSystem }) {
  const [dietTab, setDietTab] = useState(0)
  const [openSection, setOpenSection] = useState<'diet' | 'exercise' | 'timeline' | 'habits' | null>('diet')
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const toggle = (s: typeof openSection) => setOpenSection(prev => prev === s ? null : s)
  const goalColor = plan.goal === 'lose' ? '#22c55e' : plan.goal === 'gain' ? '#a855f7' : '#3b82f6'
  const goalBg = plan.goal === 'lose' ? 'rgba(34,197,94,0.08)' : plan.goal === 'gain' ? 'rgba(168,85,247,0.08)' : 'rgba(59,130,246,0.08)'

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Header */}
      <div className="rounded-xl border p-4" style={{ borderColor: goalColor + '44', background: goalBg }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: goalColor }} />
            <span className="text-sm font-semibold">AI Health Plan</span>
          </div>
          <Badge variant="outline" style={{ color: goalColor, borderColor: goalColor + '66' }}>{plan.goalLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>
        {plan.timeline.weeksToGoal > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.weeksToGoal}</p>
              <p className="text-[10px] text-muted-foreground">weeks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.weeklyChange}</p>
              <p className="text-[10px] text-muted-foreground">{wUnit}/week</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: goalColor }}>{plan.timeline.targetWeight}</p>
              <p className="text-[10px] text-muted-foreground">target {wUnit}</p>
            </div>
          </div>
        )}
      </div>

      {/* Diet Plan */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('diet')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold">Diet Plan</span>
            <span className="text-xs text-muted-foreground">4 options</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'diet' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'diet' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {plan.dietOptions.map((d, i) => (
                <button key={i} onClick={() => setDietTab(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${dietTab === i ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}>
                  <span>{d.emoji}</span><span>{d.name}</span>
                </button>
              ))}
            </div>
            {(() => { const d = plan.dietOptions[dietTab]; return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{d.description}</p>
                  <Badge variant="secondary" className="ml-2 text-[10px] flex-shrink-0">{d.tag}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-secondary/50 rounded-lg p-2 text-center col-span-1">
                    <p className="text-[10px] text-muted-foreground">Calories</p>
                    <p className="text-sm font-bold text-orange-400">{d.calories.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Protein</p>
                    <p className="text-sm font-bold text-blue-400">{d.macros.protein}g</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Carbs</p>
                    <p className="text-sm font-bold text-yellow-400">{d.macros.carbs}g</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Fat</p>
                    <p className="text-sm font-bold text-purple-400">{d.macros.fat}g</p>
                  </div>
                </div>
                <div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-blue-400 rounded-l-full" style={{ width: `${Math.round(d.macros.protein*4/d.calories*100)}%` }} />
                    <div className="bg-yellow-400" style={{ width: `${Math.round(d.macros.carbs*4/d.calories*100)}%` }} />
                    <div className="bg-purple-400 rounded-r-full" style={{ width: `${Math.round(d.macros.fat*9/d.calories*100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Protein {Math.round(d.macros.protein*4/d.calories*100)}%</span>
                    <span>Carbs {Math.round(d.macros.carbs*4/d.calories*100)}%</span>
                    <span>Fat {Math.round(d.macros.fat*9/d.calories*100)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-green-400 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Apple className="w-3 h-3" />Eat More</p>
                    <div className="space-y-1">{d.foods.map(f => <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1"><span className="text-green-400">✓</span>{f}</p>)}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-red-400 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Leaf className="w-3 h-3" />Avoid</p>
                    <div className="space-y-1">{d.avoid.map(f => <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1"><span className="text-red-400">✗</span>{f}</p>)}</div>
                  </div>
                </div>
              </div>
            )})()}
          </div>
        )}
      </div>

      {/* Exercise Routine */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('exercise')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Exercise Routine</span>
            <span className="text-xs text-muted-foreground">7-day schedule</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'exercise' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'exercise' && (
          <div className="px-4 pb-4 space-y-2">
            {plan.exerciseRoutine.map((day, i) => (
              <div key={i} className={`rounded-lg border p-3 ${day.rest ? 'border-border/30 opacity-60' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-12">{day.day.slice(0, 3).toUpperCase()}</span>
                    <span className="text-xs font-semibold">{day.type}</span>
                  </div>
                  {!day.rest && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{day.intensity}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{day.duration}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 ml-14">
                  {day.exercises.map((ex, j) => <p key={j} className="text-[11px] text-muted-foreground">{day.rest ? `💤 ${ex}` : `• ${ex}`}</p>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goal Timeline */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('timeline')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Goal Timeline</span>
            {plan.timeline.weeksToGoal > 0 && <span className="text-xs text-muted-foreground">{plan.timeline.weeksToGoal} weeks</span>}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'timeline' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'timeline' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground">Current BMI</p><p className="text-base font-bold">{plan.timeline.currentBMI}</p></div>
              <div className="bg-secondary/50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground">Target BMI</p><p className="text-base font-bold text-green-400">{plan.timeline.targetBMI}</p></div>
              <div className="bg-secondary/50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground">Target Weight</p><p className="text-base font-bold">{plan.timeline.targetWeight} {wUnit}</p></div>
            </div>
            <div className="space-y-2 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
              {plan.timeline.milestones.map((m, i) => (
                <div key={i} className="flex gap-3 items-start relative">
                  <div className="w-6 h-6 rounded-full border-2 border-border bg-card flex items-center justify-center flex-shrink-0 z-10">
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">Week {m.week}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.target}</p>
                    <p className="text-[11px] text-primary/70 mt-0.5">→ {m.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily Habits */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => toggle('habits')} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">Daily Habits</span>
            <span className="text-xs text-muted-foreground">{plan.habits.length} tips</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === 'habits' ? 'rotate-180' : ''}`} />
        </button>
        {openSection === 'habits' && (
          <div className="px-4 pb-4 space-y-2">
            {plan.habits.map((h, i) => (
              <div key={i} className="flex gap-2 p-2 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center pb-2">Generated by rule-based engine · AI-powered plans coming in Pro</p>
    </div>
  )
}
