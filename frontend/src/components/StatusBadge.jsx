/**
 * Severity badge component.
 * Props:
 *   severity: 'critical' | 'high' | 'medium'
 *   size: 'sm' | 'md' (default 'md')
 */
import { cn } from '@/lib/utils'

const CLASSES = {
  critical: 'bg-critical/10 text-critical border border-critical/40',
  high:     'bg-high/10 text-high border border-high/40',
  medium:   'bg-medium/10 text-medium border border-medium/40',
}

const LABELS = { critical: '⚠ CRITICAL', high: 'HIGH', medium: 'MEDIUM' }

const SIZE_CLASSES = {
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
}

export default function StatusBadge({ severity, size = 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-mono font-semibold tracking-wide uppercase',
        CLASSES[severity],
        SIZE_CLASSES[size],
      )}
    >
      {LABELS[severity]}
    </span>
  )
}
