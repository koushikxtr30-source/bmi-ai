import { Scale, Ruler } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SharedInputs, UnitSystem, Sex } from '@/types'

export function SharedFields({ inputs, errors, unitSystem, onChange }: {
  inputs: SharedInputs; errors: Record<string, string>; unitSystem: UnitSystem
  onChange: (f: keyof SharedInputs, v: string) => void
}) {
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const inputCls = (err?: string) => `h-12 text-base ${err ? 'border-destructive' : ''}`
  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Scale className="w-4 h-4 text-muted-foreground" />Weight ({wUnit})
        </Label>
        <Input type="number" inputMode="decimal"
          placeholder={unitSystem === 'metric' ? 'e.g. 70' : 'e.g. 154'}
          value={inputs.weight} onChange={e => onChange('weight', e.target.value)}
          className={inputCls(errors.weight)} min="0" step="0.1" />
        {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Ruler className="w-4 h-4 text-muted-foreground" />Height ({unitSystem === 'metric' ? 'cm' : 'ft / in'})
        </Label>
        {unitSystem === 'metric' ? (
          <Input type="number" inputMode="decimal" placeholder="e.g. 175"
            value={inputs.height} onChange={e => onChange('height', e.target.value)}
            className={inputCls(errors.height)} min="0" step="0.1" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input type="number" inputMode="numeric" placeholder="Feet"
                value={inputs.heightFt} onChange={e => onChange('heightFt', e.target.value)}
                className={inputCls(errors.height)} min="0" />
              <span className="text-xs text-muted-foreground mt-1 block">Feet</span>
            </div>
            <div>
              <Input type="number" inputMode="numeric" placeholder="Inches"
                value={inputs.heightIn} onChange={e => onChange('heightIn', e.target.value)}
                className={inputCls(errors.height)} min="0" max="11" />
              <span className="text-xs text-muted-foreground mt-1 block">Inches</span>
            </div>
          </div>
        )}
        {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            Age
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">needed for BMR & TDEE</span>
          </Label>
          <Input type="number" inputMode="numeric" placeholder="e.g. 30"
            value={inputs.age} onChange={e => onChange('age', e.target.value)}
            className={inputCls(errors.age)} min="1" max="120" />
          {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sex</Label>
          <div className="flex gap-2 h-12 items-center">
            {(['male', 'female'] as Sex[]).map(s => (
              <button key={s} onClick={() => onChange('sex', s)}
                className={`flex-1 h-10 rounded-md text-sm border transition-colors capitalize touch-target ${
                  inputs.sex === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
