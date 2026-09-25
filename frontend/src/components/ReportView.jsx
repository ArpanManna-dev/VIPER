/**
 * Full vulnerability report — shown when session:complete event received.
 * Props:
 *   report:    VulnerabilityReport object or null
 *   sessionId: string
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatusBadge from '@/components/StatusBadge'
import { getReport } from '@/api/client'

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 }

const SUMMARY_CARDS = [
  { key: 'total_attacks', label: 'Total Attacks' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'chains_discovered', label: 'Chains' },
  { key: 'patches_validated', label: 'Patches Validated' },
]

function FindingCard({ finding, patch, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)', y: 8 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">#{finding.id} — {finding.category}</CardTitle>
            <StatusBadge severity={finding.severity} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Payload: </span><span className="font-mono text-xs">{finding.payload}</span></p>
          <p><span className="text-muted-foreground">Response: </span><span className="font-mono text-xs">{finding.chatbot_response}</span></p>
          <p><span className="text-muted-foreground">Consequence: </span>{finding.consequence}</p>
          {patch && (
            <p className="text-muted-foreground">
              Patch: {patch.patch_description} — {finding.validated
                ? <span className="text-success">validated fixed</span>
                : <span className="text-critical">{patch.retest_result ?? 'pending validation'}</span>}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ReportView({ report, sessionId }) {
  const [downloading, setDownloading] = useState(false)

  if (!report) return null

  const patchByFinding = Object.fromEntries(report.patches.map(p => [p.finding_id, p]))
  const rankedFindings = [...report.findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  )

  const handleDownload = async () => {
    setDownloading(true)
    const { data } = await getReport(sessionId)
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `viper-report-${sessionId}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vulnerability Report</h2>
        <Button onClick={handleDownload} disabled={downloading} variant="outline">
          <Download data-icon="inline-start" />
          {downloading ? 'Downloading…' : 'Download JSON'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {SUMMARY_CARDS.map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <div className="font-mono text-xl font-bold">{report.summary[key]}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Findings (ranked by severity)</h3>
        {rankedFindings.map((finding, i) => (
          <FindingCard key={finding.id} finding={finding} patch={patchByFinding[finding.id]} index={i} />
        ))}
      </div>

      {report.chains.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-chain">Chains</h3>
          {report.chains.map((chain) => (
            <Card key={chain.id} className="border-chain/30 bg-chain/5">
              <CardContent className="space-y-1 pt-4 text-sm">
                <p className="font-mono text-xs text-chain">findings #{chain.finding_ids.join(', #')}</p>
                <p>{chain.description}</p>
                <p className="text-muted-foreground">{chain.consequence}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
