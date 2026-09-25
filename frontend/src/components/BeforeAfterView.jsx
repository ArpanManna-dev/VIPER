/**
 * Side-by-side proof of fix validation.
 * Props:
 *   finding: Finding object
 *   patch:   Patch object or null
 *
 * Only renders when patch exists and patch.validated === true.
 * Left panel (red tint): original payload + response — BEFORE.
 * Right panel (green tint, BlurFade-in): same payload retested after patch — AFTER.
 */
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const RETEST_LABEL = {
  fixed: 'Fixed',
  still_vulnerable: 'Still Vulnerable',
  degraded: 'Degraded',
}
const RETEST_CLASS = {
  fixed: 'bg-success/10 text-success border-success/40',
  still_vulnerable: 'bg-critical/10 text-critical border-critical/40',
  degraded: 'bg-medium/10 text-medium border-medium/40',
}

function Panel({ tone, label, payload, response }) {
  const toneClass = tone === 'before'
    ? 'border-critical/30 bg-critical/5'
    : 'border-success/30 bg-success/5'
  const labelClass = tone === 'before' ? 'text-critical' : 'text-success'

  return (
    <div className={cn('flex-1 rounded-lg border px-4 py-3', toneClass)}>
      <h4 className={cn('font-mono text-xs font-semibold uppercase tracking-wide', labelClass)}>{label}</h4>
      <p className="mt-2 font-mono text-xs text-foreground">→ {payload}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">↳ {response}</p>
    </div>
  )
}

export default function BeforeAfterView({ finding, patch }) {
  if (!patch || !patch.validated) return null

  const confidencePct = Math.round((patch.confidence ?? 0) * 100)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{finding.category} — Fix Validation</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{patch.patch_description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">confidence {confidencePct}%</span>
          <span className={cn('rounded border px-2 py-0.5 font-mono text-[10px] uppercase', RETEST_CLASS[patch.retest_result])}>
            {RETEST_LABEL[patch.retest_result] ?? patch.retest_result}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <Panel tone="before" label="Before" payload={finding.payload} response={finding.chatbot_response} />
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
        >
          <Panel
            tone="after"
            label="After"
            payload={finding.payload}
            response={patch.retest_response}
          />
        </motion.div>
      </div>
    </div>
  )
}
