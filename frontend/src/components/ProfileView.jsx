/**
 * Shows the profiling phase: probe messages, responses, and final profile card.
 * Props:
 *   probeEvents: array of red:probe SSE events
 *   profile:     ChatbotProfile object or null (null during profiling)
 *   phase:       current phase string
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ProbeCard({ event, index }) {
  const { message, response, observations } = event.data
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <p className="font-mono text-xs text-primary">→ {message}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">↳ {response}</p>
      {observations?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {observations.map((o, i) => (
            <li key={i} className="text-[11px] text-foreground/70">• {o}</li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

function ProfileCard({ profile }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm text-primary">Target Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domain</h4>
            <p className="mt-1 text-sm">{profile.domain}</p>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</h4>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {profile.capabilities.map((c, i) => (
                <li key={i} className="rounded border border-border bg-secondary px-2 py-0.5 text-xs">{c}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification Steps</h4>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {profile.verification_steps.map((v, i) => (
                <li key={i} className="rounded border border-border bg-secondary px-2 py-0.5 text-xs">{v}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hypothesized Vulnerabilities
            </h4>
            <ol className="mt-1 space-y-1">
              {profile.hypothesized_vulnerabilities.map((h, i) => (
                <li key={i} className="text-sm">
                  <span className="mr-1.5 font-mono text-xs text-critical">{i + 1}.</span>{h}
                </li>
              ))}
            </ol>
          </section>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ProfileView({ probeEvents, profile, phase }) {
  return (
    <div className="space-y-3">
      {!profile && (
        <AnimatePresence>
          {probeEvents.map((event, i) => (
            <ProbeCard key={i} event={event} index={i} />
          ))}
          {probeEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">Sending benign probes to profile the target…</p>
          )}
        </AnimatePresence>
      )}

      {profile && <ProfileCard profile={profile} />}
    </div>
  )
}
