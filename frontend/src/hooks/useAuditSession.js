/**
 * Session state hook — manages the full audit session lifecycle.
 *
 * Returns:
 *   session       — current AuditSession object (from /audit/start response)
 *   findings      — array of Finding objects (updated from SSE red:finding events)
 *   chains        — array of ChainFinding objects (from chain:discovered events)
 *   patches       — array of Patch objects (from blue:patch_generated events)
 *   severityCount — { critical: n, high: n, medium: n }
 *   start(url)    — starts a new audit session
 *   reset()       — clears all state
 *   error         — string error message or null
 */
import { useState, useCallback } from 'react'
import { startAudit } from '@/api/client'

export function useAuditSession() {
  const [session, setSession]         = useState(null)
  const [findings, setFindings]       = useState([])
  const [chains, setChains]           = useState([])
  const [patches, setPatches]         = useState([])
  const [error, setError]             = useState(null)

  const severityCount = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high:     findings.filter(f => f.severity === 'high').length,
    medium:   findings.filter(f => f.severity === 'medium').length,
  }

  const start = useCallback(async (targetUrl) => {
    setError(null)
    const { data, error: startError } = await startAudit(targetUrl)
    if (startError) {
      setError(startError)
      return
    }
    setSession(data)
  }, [])

  const reset = useCallback(() => {
    setSession(null)
    setFindings([])
    setChains([])
    setPatches([])
    setError(null)
  }, [])

  // Findings arrive whole (red:finding) but gain `validated` later via a
  // separate red:retest_result event, so upsert by id rather than append.
  const addFinding = useCallback((finding) => {
    setFindings(prev => {
      const idx = prev.findIndex(f => f.id === finding.id)
      if (idx === -1) return [...prev, finding]
      const next = [...prev]
      next[idx] = { ...next[idx], ...finding }
      return next
    })
  }, [])

  const addChain = useCallback((chain) => {
    setChains(prev => [...prev, chain])
  }, [])

  // blue:patch_generated has no patch id yet; blue:validation_result adds
  // patch_id/validated/retest_result for the same finding_id — upsert by that.
  const addPatch = useCallback((patch) => {
    setPatches(prev => {
      const idx = prev.findIndex(p => p.finding_id === patch.finding_id)
      if (idx === -1) return [...prev, patch]
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  return {
    session, findings, chains, patches, severityCount,
    start, reset, error, addFinding, addChain, addPatch,
  }
}
