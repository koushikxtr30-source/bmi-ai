export function ArcGauge({ value, min, max, color, segments }: {
  value: number; min: number; max: number; color: string
  segments: { from: number; to: number; color: string }[]
}) {
  const pct = (Math.min(Math.max(value, min), max) - min) / (max - min)
  const cx = 100, cy = 90, r = 70
  const toRad = (d: number) => d * Math.PI / 180
  const ax = (d: number) => cx + r * Math.cos(toRad(d))
  const ay = (d: number) => cy + r * Math.sin(toRad(d))
  const needleAngle = -180 + pct * 180
  const bmiToAngle = (bmi: number) => -180 + ((bmi - min) / (max - min)) * 180
  const labelR = r + 14
  const lx = (d: number) => cx + labelR * Math.cos(toRad(d))
  const ly = (d: number) => cy + labelR * Math.sin(toRad(d))

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => (
        <path key={i}
          d={`M ${ax(seg.from)} ${ay(seg.from)} A ${r} ${r} 0 ${seg.to - seg.from > 180 ? 1 : 0} 1 ${ax(seg.to)} ${ay(seg.to)}`}
          fill="none" stroke={seg.color} strokeWidth="12" strokeLinecap="round" opacity="0.85"
        />
      ))}
      <line x1={cx} y1={cy} x2={cx + (r - 10) * Math.cos(toRad(needleAngle))} y2={cy + (r - 10) * Math.sin(toRad(needleAngle))} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {([{ bmi: 18.5, label: '18.5' }, { bmi: 25, label: '25' }, { bmi: 30, label: '30' }] as { bmi: number; label: string }[]).map(({ bmi, label }) => {
        const a = bmiToAngle(bmi)
        const tx = cx + (r - 6) * Math.cos(toRad(a)), ty = cy + (r - 6) * Math.sin(toRad(a))
        const tx2 = cx + (r + 2) * Math.cos(toRad(a)), ty2 = cy + (r + 2) * Math.sin(toRad(a))
        return (
          <g key={bmi}>
            <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="rgba(150,150,150,0.6)" strokeWidth="1.5" />
            <text x={lx(a)} y={ly(a)} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="rgba(150,150,150,0.8)">{label}</text>
          </g>
        )
      })}
      <text x={lx(bmiToAngle(14))} y={ly(bmiToAngle(14)) + 2} textAnchor="middle" fontSize="6" fill="hsl(200 80% 55%)" opacity="0.9">Under</text>
      <text x={lx(bmiToAngle(21.5))} y={ly(bmiToAngle(21.5)) + 2} textAnchor="middle" fontSize="6" fill="hsl(142 76% 45%)" opacity="0.9">Normal</text>
      <text x={lx(bmiToAngle(27.5))} y={ly(bmiToAngle(27.5)) + 2} textAnchor="middle" fontSize="6" fill="hsl(35 95% 55%)" opacity="0.9">Over</text>
      <text x={lx(bmiToAngle(35))} y={ly(bmiToAngle(35)) + 2} textAnchor="middle" fontSize="6" fill="hsl(0 84% 60%)" opacity="0.9">Obese</text>
    </svg>
  )
}
