'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { seekTo, useCurrentTime } from '@/components/playback/playback-store'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedbackSegment } from '@/lib/ai/feedback-schema'

const FOLLOW_GRACE_MS = 8000

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
 * Per-segment feedback rendered as an accordion. Only one segment is
 * expanded at a time — by default it follows playback (whatever segment
 * `currentTime` is in). The user can click another segment to read it;
 * we then suspend auto-follow for FOLLOW_GRACE_MS so playback updates
 * don't yank them back.
 */
export function SegmentFeedback({ segments }: { segments: FeedbackSegment[] }) {
    const currentTime = useCurrentTime()
    const activeIndex = segments.findIndex(
        (s) => currentTime >= s.start_seconds && currentTime < s.end_seconds,
    )
    const [openValue, setOpenValue] = useState<string>(() => itemValue(Math.max(0, activeIndex)))
    const [manualOverrideAt, setManualOverrideAt] = useState(0)

    useEffect(() => {
        if (activeIndex < 0) return
        if (Date.now() - manualOverrideAt < FOLLOW_GRACE_MS) return
        setOpenValue(itemValue(activeIndex))
    }, [activeIndex, manualOverrideAt])

    const onValueChange = (value: string) => {
        // Empty string means "the current item was collapsed". Honor that.
        setOpenValue(value)
        setManualOverrideAt(Date.now())
    }

    if (!segments.length) return null

    return (
        <Accordion
            type="single"
            collapsible
            value={openValue}
            onValueChange={onValueChange}
            className="flex flex-col gap-2"
        >
            {segments.map((seg, i) => (
                <SegmentItem
                    key={i}
                    index={i}
                    segment={seg}
                    isActive={i === activeIndex}
                />
            ))}
        </Accordion>
    )
}

function itemValue(i: number) {
    return `segment-${i}`
}

function SegmentItem({
    index,
    segment,
    isActive,
}: {
    index: number
    segment: FeedbackSegment
    isActive: boolean
}) {
    return (
        <AccordionItem
            value={itemValue(index)}
            className={cn(
                // shadcn's default AccordionItem ships with `last:border-b-0`,
                // which clipped the bottom border of the last card. The
                // `last:border-b` here puts it back.
                'rounded-lg border bg-card transition-colors last:border-b',
                isActive && 'border-primary/40 bg-primary/[0.03]',
            )}
        >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex flex-1 items-center gap-3 text-left">
                    <span
                        className={cn(
                            'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                    >
                        {index + 1}
                    </span>
                    <span className="text-sm font-medium">{segment.title}</span>
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                        {formatRange(segment.start_seconds, segment.end_seconds)}
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-muted-foreground text-sm leading-relaxed">{segment.summary}</p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation()
                                seekTo(segment.start_seconds)
                            }}
                        >
                            Jump to {formatRange(segment.start_seconds, segment.end_seconds).split(' ')[0]}
                        </Button>
                    </div>
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
                                icon={
                                    <TriangleAlert className="size-3.5 text-amber-600 dark:text-amber-400" />
                                }
                                label="What to improve"
                                items={segment.improvements}
                                empty="Nothing to flag in this segment."
                            />
                        </div>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
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
                <p className="text-muted-foreground text-sm italic">{empty}</p>
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
