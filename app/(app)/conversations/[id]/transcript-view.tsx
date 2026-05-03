'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import { seekTo, useCurrentTime } from '@/components/playback/playback-store'
import { cn } from '@/lib/utils'
import type { TranscriptParagraph, TranscriptSegments, TranscriptSentence } from '@/lib/ai/transcribe'

const SCROLL_GRACE_MS = 5000

/**
 * Interactive transcript pane: paragraphs separated by speaker, sentences
 * are clickable to seek the audio, the active sentence (whichever one
 * `currentTime` falls inside) is highlighted karaoke-style.
 *
 * Auto-scroll keeps the active sentence centered inside *the container*
 * (not the page — see comment on the scroll math below). Pauses for
 * SCROLL_GRACE_MS after the user manually scrolls so we don't fight them
 * when they want to read elsewhere.
 */
export function TranscriptView({
    segments,
    repSpeakerNumber,
}: {
    segments: TranscriptSegments
    repSpeakerNumber: number | null | undefined
}) {
    const currentTime = useCurrentTime()
    const containerRef = useRef<HTMLDivElement>(null)
    const lastAutoScrollAt = useRef(0)
    const userScrolledAtRef = useRef(0)

    // Find the active sentence by linear scan; transcripts are short enough
    // that this is cheap, and a sorted-array binary search would add code
    // for no measurable gain.
    const activeSentence = useMemo(() => {
        for (const p of segments.paragraphs) {
            for (const s of p.sentences) {
                if (currentTime >= s.start && currentTime < s.end) return s
            }
        }
        return null
    }, [segments, currentTime])

    // Track manual scrolls. We can't perfectly distinguish user scrolls
    // from programmatic ones, so we suppress the next event for a short
    // window after each programmatic scroll and treat anything else as
    // user-initiated.
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const onScroll = () => {
            if (Date.now() - lastAutoScrollAt.current < 250) return
            userScrolledAtRef.current = Date.now()
        }
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [])

    // Auto-scroll the active sentence into view when it changes — unless
    // the user scrolled in the last SCROLL_GRACE_MS.
    //
    // We don't use scrollIntoView({ block: 'center' }) because in nested
    // scrollable contexts (this container *and* the page itself can both
    // scroll) some browsers also nudge the page, which is exactly the bug
    // this code is meant to avoid. Computing the scroll offset by hand and
    // calling container.scrollTo guarantees only the container moves.
    useEffect(() => {
        if (!activeSentence) return
        const container = containerRef.current
        if (!container) return
        const target = container.querySelector<HTMLElement>(
            `[data-sentence-start="${activeSentence.start}"]`,
        )
        if (!target) return
        if (Date.now() - userScrolledAtRef.current < SCROLL_GRACE_MS) return

        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const offsetWithinContainer = targetRect.top - containerRect.top + container.scrollTop
        const desiredTop = offsetWithinContainer - container.clientHeight / 2 + targetRect.height / 2

        lastAutoScrollAt.current = Date.now()
        container.scrollTo({ top: Math.max(0, desiredTop), behavior: 'smooth' })
    }, [activeSentence])

    return (
        <div
            ref={containerRef}
            className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto overscroll-contain pr-2"
        >
            {segments.paragraphs.map((paragraph, i) => (
                <Paragraph
                    key={i}
                    paragraph={paragraph}
                    activeStart={activeSentence?.start ?? null}
                    isRep={
                        repSpeakerNumber != null &&
                        paragraph.speaker != null &&
                        paragraph.speaker === repSpeakerNumber
                    }
                />
            ))}
        </div>
    )
}

function Paragraph({
    paragraph,
    activeStart,
    isRep,
}: {
    paragraph: TranscriptParagraph
    activeStart: number | null
    isRep: boolean
}) {
    const speakerLabel = paragraph.speaker == null ? 'Speaker' : isRep ? 'Rep' : 'Customer'
    const speakerTone = isRep ? 'text-foreground' : 'text-muted-foreground'

    return (
        <div className="flex gap-3">
            <div className={cn('w-16 shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide', speakerTone)}>
                {speakerLabel}
            </div>
            <p className="flex-1 text-sm leading-relaxed">
                {paragraph.sentences.map((sentence, j) => (
                    <Fragment key={j}>
                        <SentenceButton sentence={sentence} isActive={sentence.start === activeStart} />{' '}
                    </Fragment>
                ))}
            </p>
        </div>
    )
}

function SentenceButton({ sentence, isActive }: { sentence: TranscriptSentence; isActive: boolean }) {
    return (
        <button
            type="button"
            data-sentence-start={sentence.start}
            onClick={() => seekTo(sentence.start)}
            className={cn(
                'inline cursor-pointer rounded px-0.5 text-left transition-colors',
                'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                isActive && 'bg-primary/15 text-foreground',
            )}
        >
            {sentence.text}
        </button>
    )
}
