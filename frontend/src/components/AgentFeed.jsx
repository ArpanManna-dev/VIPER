/**
 * Live reasoning feed for one agent (shared by Red and Blue).
 * Props:
 *   events:    array of SSE event objects
 *   agentType: 'red' | 'blue'
 *   title:     string displayed in header
 *   active:    boolean — whether this agent is currently running
 *
 * Red feed: critical (red) accent. Blue feed: success (green) accent — the
 * project's severity/brand tokens read naturally as "red team" / "defender".
 * Each new line fades/slides in (framer-motion) rather than a full
 * character-by-character typewriter, per the stub's CSS-animation fallback.
 * Auto-scrolls to latest event. Animated cursor while active=true.
 */
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const ACCENT = {
  red:  { text: 'text-critical', border: 'border-critical/30', dot: 'bg-critical' },
  blue: { text: 'text-success',  border: 'border-success/30',  dot: 'bg-success' },
}

function formatEvent(event) {
  const d = event.data || {}
  switch (event.type) {
    case 'red:reasoning':
    case 'blue:reasoning':
      return d.text
    case 'red:probe':
      return `probe → "${d.message}"\n↳ ${d.response}`
    case 'red:profile_complete':
      return `profile complete — domain: ${d.profile?.domain}`
    case 'red:attack':
      return `attack [${d.category}] → ${d.payload}`
    case 'red:finding':
      return `FINDING #${d.finding?.id} — ${d.finding?.category} (${d.finding?.severity})`
    case 'red:retest':
      return `retesting finding #${d.finding_id}...`
    case 'red:retest_result':
      return `retest #${d.finding_id} → ${d.result}`
    case 'blue:analyzing':
      return `analyzing #${d.finding_id} — ${d.finding_summary}`
    case 'blue:patch_generated':
      return `patch for #${d.finding_id} — ${d.patch_description} (confidence ${Math.round((d.confidence ?? 0) * 100)}%)`
    case 'blue:validation':
      return `validating #${d.finding_id} — ${d.testing}`
    case 'blue:validation_result':
      return `validation #${d.finding_id} → ${d.result} (${d.patch_id})`
    default:
      return JSON.stringify(d)
  }
}

export default function AgentFeed({ events, agentType, title, active }) {
  const accent = ACCENT[agentType] ?? ACCENT.red
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events])

  return (
    <div className={cn('flex h-80 flex-col rounded-lg border bg-card', accent.border)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className={cn('size-2 rounded-full', accent.dot, active && 'animate-pulse-slow')} />
        <h3 className={cn('font-mono text-xs font-semibold uppercase tracking-wide', accent.text)}>
          {title}
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2 font-mono text-xs text-foreground">
        <AnimatePresence initial={false}>
          {events.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="whitespace-pre-wrap break-words text-muted-foreground"
            >
              {formatEvent(event)}
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <p className="text-muted-foreground/60">Waiting for {agentType === 'red' ? 'Red' : 'Blue'} Agent…</p>
        )}

        {active && (
          <motion.span
            className={cn('inline-block h-3 w-1.5', accent.dot)}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}
