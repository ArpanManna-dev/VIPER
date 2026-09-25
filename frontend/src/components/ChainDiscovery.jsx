/**
 * Displays vulnerability chain findings.
 * Props:
 *   chains: array of ChainFinding objects
 *
 * Hidden when chains is empty. Meteors background effect on first appearance,
 * built from a fixed set of literal Tailwind position/delay classes (never
 * inline style — arbitrary values are only picked up by Tailwind's JIT scanner
 * when written as literal strings in source).
 * Amber/purple ("chain") treatment distinguishes chains from regular findings.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'

const METEORS = [
  'left-[8%] [animation-delay:0.1s]',
  'left-[22%] [animation-delay:0.9s]',
  'left-[38%] [animation-delay:0.3s]',
  'left-[54%] [animation-delay:1.5s]',
  'left-[68%] [animation-delay:0.6s]',
  'left-[82%] [animation-delay:1.1s]',
  'left-[94%] [animation-delay:0.4s]',
]

function Meteors() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {METEORS.map((pos, i) => (
        <span
          key={i}
          className={`absolute top-0 h-0.5 w-0.5 rotate-[215deg] rounded-full bg-chain animate-meteor before:absolute before:top-1/2 before:h-px before:w-14 before:-translate-y-1/2 before:bg-gradient-to-r before:from-chain before:to-transparent ${pos}`}
        />
      ))}
    </div>
  )
}

function ChainCard({ chain, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="relative overflow-hidden rounded-lg border border-chain/40 bg-chain/5 px-4 py-3"
    >
      {index === 0 && <Meteors />}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-chain" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-chain">
            Chain — findings #{chain.finding_ids.join(', #')}
          </span>
        </div>
        <StatusBadge severity={chain.combined_severity === 'critical' ? 'critical' : 'high'} size="sm" />
      </div>
      <p className="relative mt-2 text-sm text-foreground">{chain.description}</p>
      <p className="relative mt-1.5 text-xs text-muted-foreground">
        <span className="font-semibold text-chain">Consequence: </span>{chain.consequence}
      </p>
    </motion.div>
  )
}

export default function ChainDiscovery({ chains }) {
  if (!chains || chains.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-chain">
        Vulnerability Chains Discovered
      </h3>
      <AnimatePresence>
        {chains.map((chain, i) => (
          <ChainCard key={chain.id} chain={chain} index={i} />
        ))}
      </AnimatePresence>
    </div>
  )
}
