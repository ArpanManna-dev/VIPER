/**
 * Live battle graph — Red Agent and Blue Agent converging on the target
 * chatbot, with each discovered finding rendered as its own node orbiting
 * the target and re-colored once patched. Purely presentational: driven
 * entirely by the same SSE-derived props already flowing into Dashboard
 * (redEvents/blueEvents/findings/patchByFinding) — no backend changes,
 * no new event types.
 *
 * Layout is an SVG node graph (curved edges, dot-grid backdrop) rather than
 * a straight two-line diagram, so it reads like a live attack-surface map.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, ShieldCheck, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_W = 640
const VIEW_H = 280
const RED_POS = { x: 70, y: 140 }
const BLUE_POS = { x: 570, y: 140 }
const TARGET_POS = { x: 320, y: 140 }
const SATELLITE_RADIUS = 92
const SATELLITE_BASE_ANGLE = 90 // degrees, pointing down from target

const SEVERITY_STROKE = { critical: '#ef4444', high: '#f97316', medium: '#eab308' }

function pct(v, axis) {
  return `${(v / (axis === 'x' ? VIEW_W : VIEW_H)) * 100}%`
}

function curvePath(from, to, bow = 36) {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2 - bow
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`
}

function satellitePosition(index, total) {
  const spread = Math.min(120, 34 * Math.max(total - 1, 1))
  const start = SATELLITE_BASE_ANGLE - spread / 2
  const angle = total === 1 ? SATELLITE_BASE_ANGLE : start + (spread / (total - 1)) * index
  const rad = (angle * Math.PI) / 180
  return {
    x: TARGET_POS.x + SATELLITE_RADIUS * Math.cos(rad),
    y: TARGET_POS.y + SATELLITE_RADIUS * Math.sin(rad),
  }
}

function useEventPulses(events, matchType) {
  const [pulses, setPulses] = useState([])
  const seenCount = useRef(0)

  useEffect(() => {
    if (events.length <= seenCount.current) {
      seenCount.current = events.length
      return
    }
    const newOnes = events.slice(seenCount.current)
    seenCount.current = events.length
    const matched = newOnes.filter((e) => e.type === matchType)
    if (matched.length > 0) {
      setPulses((prev) => [...prev, ...matched.map(() => `${Date.now()}-${Math.random()}`)])
    }
  }, [events, matchType])

  const remove = (id) => setPulses((prev) => prev.filter((p) => p !== id))
  return [pulses, remove]
}

function AgentNode({ pos, icon: Icon, label, colorClass, glow, sublabel }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: pct(pos.x, 'x'), top: pct(pos.y, 'y') }}
    >
      <motion.div
        className={cn('flex size-14 items-center justify-center rounded-full border-2 bg-card', colorClass)}
        animate={glow ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
        style={glow ? { boxShadow: '0 0 24px 4px currentColor' } : { boxShadow: '0 0 8px 0px currentColor' }}
      >
        <Icon className="size-6" />
      </motion.div>
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {sublabel && <span className="font-mono text-[9px] text-muted-foreground/70">{sublabel}</span>}
    </div>
  )
}

function FindingNode({ pos, severity, fixed }) {
  const activeColor = fixed ? '#3b82f6' : (SEVERITY_STROKE[severity] ?? SEVERITY_STROKE.medium)
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: pct(pos.x, 'x'), top: pct(pos.y, 'y') }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <div
        className="flex size-8 items-center justify-center rounded-full border-2 bg-card"
        style={{ color: activeColor, borderColor: activeColor, boxShadow: '0 0 10px 1px currentColor' }}
      >
        {fixed ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      </div>
    </motion.div>
  )
}

function EdgeParticle({ from, to, color, onDone, bow = 36 }) {
  // Sample points along the same quadratic curve used for the drawn edge,
  // and animate cx/cy through them — native SVG attribute keyframes, no
  // reliance on CSS motion-path (offset-path) support.
  const steps = 20
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2 - bow
  const cxs = []
  const cys = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    cxs.push((1 - t) ** 2 * from.x + 2 * (1 - t) * t * midX + t ** 2 * to.x)
    cys.push((1 - t) ** 2 * from.y + 2 * (1 - t) * t * midY + t ** 2 * to.y)
  }
  return (
    <motion.circle
      r="4"
      className={color}
      fill="currentColor"
      style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
      initial={{ cx: cxs[0], cy: cys[0], opacity: 0 }}
      animate={{ cx: cxs, cy: cys, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.9, ease: 'easeIn' }}
      onAnimationComplete={onDone}
    />
  )
}

export default function BattleVisual({ redEvents, blueEvents, findings = [], patchByFinding = {} }) {
  const [attackPulses, removeAttackPulse] = useEventPulses(redEvents, 'red:attack')
  const [patchPulses, removePatchPulse] = useEventPulses(blueEvents, 'blue:patch_generated')

  const [targetFlash, setTargetFlash] = useState(null)
  const seenFindings = useRef(0)
  const seenValidations = useRef(0)

  useEffect(() => {
    const newOnes = redEvents.slice(seenFindings.current)
    seenFindings.current = redEvents.length
    if (newOnes.some((e) => e.type === 'red:finding')) {
      setTargetFlash('hit')
      const t = setTimeout(() => setTargetFlash(null), 900)
      return () => clearTimeout(t)
    }
  }, [redEvents])

  useEffect(() => {
    const newOnes = blueEvents.slice(seenValidations.current)
    seenValidations.current = blueEvents.length
    if (newOnes.some((e) => e.type === 'blue:validation_result' && e.data?.result === 'fixed')) {
      setTargetFlash('fixed')
      const t = setTimeout(() => setTargetFlash(null), 900)
      return () => clearTimeout(t)
    }
  }, [blueEvents])

  const shownFindings = findings.slice(0, 6)

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card/40">
      {/* dot-grid backdrop */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.25) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="relative" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="redEdge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="blueEdge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <motion.path
            d={curvePath(RED_POS, TARGET_POS)}
            fill="none"
            stroke="url(#redEdge)"
            strokeWidth="2"
            strokeDasharray="6 6"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.path
            d={curvePath(BLUE_POS, TARGET_POS)}
            fill="none"
            stroke="url(#blueEdge)"
            strokeWidth="2"
            strokeDasharray="6 6"
            animate={{ strokeDashoffset: [0, 24] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />

          {shownFindings.map((f, i) => {
            const pos = satellitePosition(i, shownFindings.length)
            const fixed = !!f.validated
            return (
              <path
                key={f.id}
                d={curvePath(TARGET_POS, pos, 14)}
                fill="none"
                stroke={fixed ? '#3b82f6' : (SEVERITY_STROKE[f.severity] ?? SEVERITY_STROKE.medium)}
                strokeOpacity="0.55"
                strokeWidth="1.5"
              />
            )
          })}

          <AnimatePresence>
            {attackPulses.map((id) => (
              <EdgeParticle key={id} from={RED_POS} to={TARGET_POS} color="text-critical" onDone={() => removeAttackPulse(id)} />
            ))}
            {patchPulses.map((id) => (
              <EdgeParticle key={id} from={BLUE_POS} to={TARGET_POS} color="text-blue" onDone={() => removePatchPulse(id)} />
            ))}
          </AnimatePresence>
        </svg>

        <AgentNode pos={RED_POS} icon={Swords} label="Red Agent" colorClass="border-critical/50 text-critical" glow={attackPulses.length > 0} sublabel="attacking" />
        <AgentNode pos={BLUE_POS} icon={ShieldCheck} label="Blue Agent" colorClass="border-blue/50 text-blue" glow={patchPulses.length > 0} sublabel="defending" />
        <AgentNode
          pos={TARGET_POS}
          icon={Bot}
          label="ArthaPay"
          sublabel="target"
          colorClass={cn(
            'transition-colors',
            targetFlash === 'hit' && 'border-critical text-critical',
            targetFlash === 'fixed' && 'border-success text-success',
            !targetFlash && 'border-border text-muted-foreground'
          )}
          glow={targetFlash !== null}
        />

        <AnimatePresence>
          {shownFindings.map((f, i) => (
            <FindingNode
              key={f.id}
              pos={satellitePosition(i, shownFindings.length)}
              severity={f.severity}
              fixed={!!patchByFinding[f.id]?.validated || !!f.validated}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
