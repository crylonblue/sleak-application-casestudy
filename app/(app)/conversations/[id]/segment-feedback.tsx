import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FeedbackSegment } from '@/lib/ai/feedback-schema'

function formatRange(start: number, end: number) {
    const fmt = (s: number) => {
        const total = Math.floor(s)
        const m = Math.floor(total / 60)
        const sec = total % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }
    return `${fmt(start)} – ${fmt(end)}`
}

/**
 * Stacked per-segment feedback cards rendered below the overall feedback on
 * the detail page. For Phase 2 these are static — Phase 4 will hook the
 * playback context in to highlight the currently-playing segment and make
 * each card click-to-seek.
 */
export function SegmentFeedback({ segments }: { segments: FeedbackSegment[] }) {
    if (!segments.length) return null
    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Segments</h2>
            <ol className="flex flex-col gap-3">
                {segments.map((seg, i) => (
                    <li key={i}>
                        <SegmentCard index={i} segment={seg} />
                    </li>
                ))}
            </ol>
        </section>
    )
}

function SegmentCard({ index, segment }: { index: number; segment: FeedbackSegment }) {
    return (
        <Card>
            <CardHeader className="flex-row items-baseline justify-between gap-4 space-y-0">
                <div className="flex items-baseline gap-3">
                    <span className="bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
                        {index + 1}
                    </span>
                    <CardTitle className="text-base">{segment.title}</CardTitle>
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                    {formatRange(segment.start_seconds, segment.end_seconds)}
                </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm leading-relaxed">{segment.summary}</p>
                {(segment.strengths.length > 0 || segment.improvements.length > 0) && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <SegmentList
                            icon={
                                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            }
                            label="What went well"
                            items={segment.strengths}
                            empty="Nothing notable to call out here."
                        />
                        <SegmentList
                            icon={<TriangleAlert className="size-3.5 text-amber-600 dark:text-amber-400" />}
                            label="What to improve"
                            items={segment.improvements}
                            empty="Nothing to flag in this segment."
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function SegmentList({
    icon,
    label,
    items,
    empty,
}: {
    icon: React.ReactNode
    label: string
    items: string[]
    empty: string
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                {icon}
                {label}
            </div>
            {items.length === 0 ? (
                <p className={cn('text-muted-foreground text-sm italic')}>{empty}</p>
            ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                            <span className="leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
