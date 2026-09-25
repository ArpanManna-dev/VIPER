/**
 * Target URL input and Start Audit button.
 * Props:
 *   onStart: (url: string) => void
 *   disabled: boolean
 *
 * ShimmerButton (Magic UI) isn't an installed package — this is a hand-rolled
 * shimmer using the `shimmer` keyframe added to tailwind.config.js.
 */
import { useState } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function TargetConfig({ onStart, disabled }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValidUrl(url)) {
      setError('Enter a valid http(s) URL')
      return
    }
    setError(null)
    onStart(url)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (error) setError(null) }}
          placeholder="http://localhost:8000/chatbot/message"
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none',
            'placeholder:text-muted-foreground focus:border-primary',
            error ? 'border-critical' : 'border-border',
          )}
        />
        {error && <p className="mt-1 text-xs text-critical">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-5 py-2',
          'bg-[linear-gradient(110deg,theme(colors.primary.DEFAULT)_45%,theme(colors.primary.foreground)_55%,theme(colors.primary.DEFAULT)_65%)]',
          'bg-[length:200%_100%] text-sm font-semibold text-primary-foreground transition-opacity',
          disabled ? 'cursor-not-allowed opacity-60' : 'animate-shimmer hover:opacity-90',
        )}
      >
        {disabled
          ? <><Loader2 className="size-4 animate-spin" />Auditing...</>
          : <><ShieldAlert className="size-4" />Start Audit</>}
      </button>
    </form>
  )
}
