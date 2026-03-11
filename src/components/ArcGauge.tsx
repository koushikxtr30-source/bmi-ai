import { BMI_SEGMENTS } from '@/constants'

interface ArcGaugeProps {
  value: number
  min: number
  max: number
  color: string
  segments?: { from: number; to: number; color: string }[]
}

export function ArcGauge({ value, min, max, color, segments = BMI_SEGMENTS }: ArcGaugeProps) {
  const pct = (Math.min(Math.max(value, min), max) - min) / (max - min)
  const cx = 100, cy = 90, r = 70
  const toRad = (d: number) => d * Math.PI / 180
  const ax = (d: number) => cx + r * Math.cos(toRad(d))
  const ay = (d: number) => cy + r * Math.sin(toRad(d))
  const needleAngle = -180 + pct * 180
  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[180px] mx-auto">
      {segments.map((seg, i) => (
        <path key={i}
          d={`M ${ax(seg.from)} ${ay(seg.from)} A ${r} ${r} 0 ${seg.to - seg.from > 180 ? 1 : 0} 1 ${ax(seg.to)} ${ay(seg.to)}`}
          fill="none" stroke={seg.color} strokeWidth="12" strokeLinecap="round" opacity="0.85"
        />
      ))}
      <line
        x1={cx} y1={cy}
        x2={cx + (r - 10) * Math.cos(toRad(needleAngle))}
        y2={cy + (r - 10) * Math.sin(toRad(needleAngle))}
        stroke={color} strokeWidth="3" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="5" fill={color} />
    </svg>
  )
}
