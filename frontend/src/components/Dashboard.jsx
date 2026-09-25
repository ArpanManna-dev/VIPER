/**
 * Main dashboard shell. Composes all components.
 * See docstring history in TASKS.md T25 / docs/ARCHITECTURE.md for the full spec.
 */
import { useEffect, useState } from 'react'
import { ShieldAlert, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuditSession } from '@/hooks/useAuditSession'
import { useAuditStream } from '@/hooks/useAuditStream'
import { getReport } from '@/api/client'
import TargetConfig from '@/components/TargetConfig'
import ProfileView from '@/components/ProfileView'
import AgentFeed from '@/components/AgentFeed'
import AttackTable from '@/components/AttackTable'
import SeverityTally from '@/components/SeverityTally'
import ChainDiscovery from '@/components/ChainDiscovery'
import BeforeAfterView from '@/components/BeforeAfterView'
import ReportView from '@/components/ReportView'
import { cn } from '@/lib/utils'

const PHASE_LABEL = { profile: 'Profiling', attack: 'Attacking', validate: 'Validating', done: 'Complete' }
const PHASE_CLASS = {
  profile:  'border-primary/40 bg-primary/10 text-primary',
  attack:   'border-critical/40 bg-critical/10 text-critical',
  validate: 'border-success/40 bg-success/10 text-success',
  done:     'border-border bg-secondary text-muted-foreground',
}

function BackgroundBeams() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/4 top-0 size-[36rem] rounded-full bg-[radial-gradient(circle,theme(colors.primary.DEFAULT)_0%,transparent_70%)] opacity-20 blur-3xl animate-pulse-slow" />
      <div className="absolute right-0 top-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,theme(colors.critical)_0%,transparent_70%)] opacity-10 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,theme(colors.success)_0%,transparent_70%)] opacity-10 blur-3xl animate-pulse-slow" />
    </div>
  )
}

function useElapsedSeconds(startedAt, stopped) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    if (stopped) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, stopped])
  return elapsed
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Dashboard() {
  const {
    session, findings, chains, patches, severityCount,
    start, reset, error, addFinding, addChain, addPatch,
  } = useAuditSession()
  const { redEvents, blueEvents, chainEvents, phase, complete } = useAuditStream(session?.session_id)
  // session:complete never arrives with its own phase:change('done') — complete is the
  // authoritative terminal signal (see mocks/sse_events.jsonl), so derive the displayed
  // phase from it rather than waiting on a phase value that will never come.
  const displayPhase = complete ? 'done' : phase

  const [profile, setProfile] = useState(null)
  const [report, setReport] = useState(null)

  const elapsed = useElapsedSeconds(session?.started_at, complete)

  // Route SSE events not already handled by useAuditStream's own arrays into
  // session-level state (findings/chains/patches/profile).
  useEffect(() => {
    const latest = redEvents[redEvents.length - 1]
    if (!latest) return
    if (latest.type === 'red:finding') addFinding(latest.data.finding)
    if (latest.type === 'red:profile_complete') setProfile(latest.data.profile)
  }, [redEvents, addFinding])

  useEffect(() => {
    const latest = chainEvents[chainEvents.length - 1]
    if (latest?.type === 'chain:discovered') addChain(latest.data.chain)
  }, [chainEvents, addChain])

  useEffect(() => {
    const latest = blueEvents[blueEvents.length - 1]
    if (!latest) return
    if (latest.type === 'blue:patch_generated') addPatch(latest.data)
    if (latest.type === 'blue:validation_result') addPatch(latest.data)
  }, [blueEvents, addPatch])

  useEffect(() => {
    if (complete && session?.session_id) {
      getReport(session.session_id).then(({ data }) => { if (data) setReport(data) })
    }
  }, [complete, session?.session_id])

  const handleStart = (url) => {
    setProfile(null)
    setReport(null)
    start(url)
  }

  const handleReset = () => {
    reset()
    setProfile(null)
    setReport(null)
  }

  const patchByFinding = Object.fromEntries(patches.map(p => [p.finding_id, p]))
  const probeEvents = redEvents.filter(e => e.type === 'red:probe')

  return (
    <div className="min-h-screen">
      <BackgroundBeams />

      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-6 text-primary" />
            <span className="font-mono text-lg font-bold tracking-wide">VIPER</span>
            {session && (
              <span className="ml-2 truncate font-mono text-xs text-muted-foreground">{session.target_url}</span>
            )}
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <span className={cn('rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wide', PHASE_CLASS[displayPhase])}>
                {PHASE_LABEL[displayPhase] ?? displayPhase}
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3.5" />{formatElapsed(elapsed)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {!session && (
          <div className="mx-auto max-w-xl pt-20">
            <h1 className="mb-1 text-center text-2xl font-bold">Start a VIPER Audit</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Point VIPER at ArthaPay (or any compatible chatbot endpoint) to begin.
            </p>
            <TargetConfig onStart={handleStart} disabled={false} />
            {error && <p className="mt-3 text-center text-sm text-critical">{error}</p>}
          </div>
        )}

        {session && !complete && (
          <>
            {phase === 'profile' && (
              <>
                <ProfileView probeEvents={probeEvents} profile={profile} phase={phase} />
                <div className="grid gap-4 md:grid-cols-2">
                  <AgentFeed events={redEvents} agentType="red" title="Red Agent" active />
                  <AgentFeed events={blueEvents} agentType="blue" title="Blue Agent" active={false} />
                </div>
              </>
            )}

            {phase === 'attack' && (
              <>
                <SeverityTally counts={severityCount} />
                <AttackTable findings={findings} />
                <div className="grid gap-4 md:grid-cols-2">
                  <AgentFeed events={redEvents} agentType="red" title="Red Agent" active />
                  <AgentFeed events={blueEvents} agentType="blue" title="Blue Agent" active={blueEvents.length > 0} />
                </div>
              </>
            )}

            {phase === 'validate' && (
              <>
                <SeverityTally counts={severityCount} />
                <AttackTable findings={findings} />
                <ChainDiscovery chains={chains} />
                <div className="space-y-3">
                  {findings.map(f => (
                    <BeforeAfterView key={f.id} finding={f} patch={patchByFinding[f.id]} />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AgentFeed events={redEvents} agentType="red" title="Red Agent" active />
                  <AgentFeed events={blueEvents} agentType="blue" title="Blue Agent" active />
                </div>
              </>
            )}
          </>
        )}

        {session && complete && (
          <Tabs defaultValue="report">
            <TabsList>
              <TabsTrigger value="attack">Attack View</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>
            <TabsContent value="attack" className="space-y-6 pt-4">
              <SeverityTally counts={severityCount} />
              <AttackTable findings={findings} />
              <ChainDiscovery chains={chains} />
              <div className="space-y-3">
                {findings.map(f => (
                  <BeforeAfterView key={f.id} finding={f} patch={patchByFinding[f.id]} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="report" className="pt-4">
              <ReportView report={report} sessionId={session.session_id} />
            </TabsContent>
          </Tabs>
        )}

        {session && (
          <div className="pt-4 text-center">
            <button onClick={handleReset} className="font-mono text-xs text-muted-foreground hover:text-foreground">
              ← start a new audit
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
