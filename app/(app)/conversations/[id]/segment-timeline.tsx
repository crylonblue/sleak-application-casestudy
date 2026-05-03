'use client'

import { seekTo, useCurrentTime } from '@/components/playback/playback-store'
import { cn } from '@/lib/utils'
import type { FeedbackSegment } from '@/lib/ai/feedback-schema'

/**
 * Compact pill + clickable horizontal timeline strip showing each segment
 * proportional to its duration. Sits inside the Recording card, under the
 * audio element. Mostly visual; the segment cards below are the real
 * surface for navigating + reading per-segment feedback.
 */
export function SegmentTimeline({ segments }: { segments: FeedbackSegment[] }) {
    const currentTime = useCurrentTime()
    const total = segments.at(-1)?.end_seconds ?? 0
    if (total <= 0) return null

    const activeIndex = segments.findIndex(
        (s) => currentTime >= s.start_seconds && currentTime < s.end_seconds,
    )
    const active = activeIndex >= 0 ? segments[activeIndex] : null

    return (
        <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs">
                {active ? (
                    <>
                        <span className="text-muted-foreground tabular-nums">
                            Segment {activeIndex + 1} of {segments.length}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-foreground font-medium">{active.title}</span>
                    </>
                ) : (
                    <span className="text-muted-foreground">{segments.length} segments</span>
                )}
            </div>
            <div className="flex h-2 overflow-hidden rounded-full">
                {segments.map((s, i) => {
                    const width = ((s.end_seconds - s.start_seconds) / total) * 100
                    const isActive = i === activeIndex
                    return (
                        <button
                            key={i}
                            type="button"
                            title={`${i + 1}. ${s.title}`}
                            onClick={() => seekTo(s.start_seconds)}
                            style={{ width: `${width}%` }}
                            className={cn(
                                'relative h-full cursor-pointer transition-colors first:rounded-l-full last:rounded-r-full',
                                'border-r border-background last:border-r-0',
                                isActive
                                    ? 'bg-primary'
                                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                            )}
                            aria-label={`Jump to segment ${i + 1}: ${s.title}`}
                        />
                    )
                })}
            </div>
        </div>
    )
}
