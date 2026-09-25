/**
 * SSE hook — connects to /audit/stream/{sessionId} and routes events.
 * See mocks/sse_events.jsonl for all event shapes.
 *
 * Returns:
 *   redEvents    — array of all red:* events (in order received)
 *   blueEvents   — array of all blue:* events
 *   chainEvents  — array of all chain:* events
 *   phase        — current phase string (from phase:change events)
 *   complete     — boolean, true after session:complete received
 */
import { useState, useEffect, useRef } from 'react'
import { getStreamUrl } from '@/api/client'

export function useAuditStream(sessionId) {
  const [redEvents, setRedEvents]     = useState([])
  const [blueEvents, setBlueEvents]   = useState([])
  const [chainEvents, setChainEvents] = useState([])
  const [phase, setPhase]             = useState('profile')
  const [complete, setComplete]       = useState(false)
  const sourceRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return

    setRedEvents([])
    setBlueEvents([])
    setChainEvents([])
    setPhase('profile')
    setComplete(false)

    const source = new EventSource(getStreamUrl(sessionId))
    sourceRef.current = source

    source.onmessage = (e) => {
      let event
      try {
        event = JSON.parse(e.data)
      } catch {
        return
      }

      if (event.type?.startsWith('red:')) {
        setRedEvents(prev => [...prev, event])
      } else if (event.type?.startsWith('blue:')) {
        setBlueEvents(prev => [...prev, event])
      } else if (event.type?.startsWith('chain:')) {
        setChainEvents(prev => [...prev, event])
      } else if (event.type === 'phase:change') {
        setPhase(event.data.phase)
      } else if (event.type === 'session:complete') {
        setComplete(true)
        source.close()
      }
    }

    return () => {
      sourceRef.current?.close()
    }
  }, [sessionId])

  return { redEvents, blueEvents, chainEvents, phase, complete }
}
