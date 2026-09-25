/**
 * Live results table showing all attacks and their outcomes.
 * Props:
 *   findings: array of Finding objects
 *
 * Columns: # | Category | Payload (truncated, tooltip on hover) | Severity | Validated
 * Reuses tailwind's existing `pulse-slow` keyframe (not a hand-rolled SVG
 * MovingBorder) to highlight the most recently added row.
 */
import { Check } from 'lucide-react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

function truncate(text, max = 60) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function AttackTable({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
        Waiting for attack phase...
      </div>
    )
  }

  const lastIndex = findings.length - 1

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="w-20 text-center">Validated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.map((f, i) => (
              <TableRow
                key={f.id}
                className={cn(i === lastIndex && 'ring-1 ring-inset ring-primary/60 animate-pulse-slow')}
              >
                <TableCell className="font-mono text-muted-foreground">{f.id}</TableCell>
                <TableCell className="font-medium">{f.category}</TableCell>
                <TableCell className="max-w-xs font-mono text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger className="cursor-default text-left">
                      {truncate(f.payload)}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm whitespace-pre-wrap">{f.payload}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell><StatusBadge severity={f.severity} size="sm" /></TableCell>
                <TableCell className="text-center">
                  {f.validated && <Check className="mx-auto size-4 text-success" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
