/**
 * Severity counter cards (Critical / High / Medium).
 * Props:
 *   counts: { critical: number, high: number, medium: number }
 * Animated count-up via requestAnimationFrame (NumberTicker isn't an installed
 * package — this is the "simple counter animation with useEffect" fallback the
 * stub explicitly allows).
 */
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

const TALLY = [
  { key: 'critical', label: 'Critical', textClass: 'text-critical', borderClass: 'border-critical/30', bgClass: 'bg-critical/5' },
  { key: 'high',      label: 'High',    textClass: 'text-high',     borderClass: 'border-high/30',     bgClass: 'bg-high/5' },
  { key: 'medium',    label: 'Medium',  textClass: 'text-medium',   borderClass: 'border-medium/30',   bgClass: 'bg-medium/5' },
]

function TallyCard({ label, value, textClass, borderClass, bgClass }) {
  const count = useCountUp(value)
  return (
    <div className={cn('flex-1 rounded-lg border px-4 py-3', borderClass, bgClass)}>
      <div className={cn('font-mono text-3xl font-bold tabular-nums', textClass)}>{count}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

export default function SeverityTally({ counts }) {
  return (
    <div className="flex gap-3">
      {TALLY.map(({ key, ...rest }) => (
        <TallyCard key={key} value={counts?.[key] ?? 0} {...rest} />
      ))}
    </div>
  )
}
