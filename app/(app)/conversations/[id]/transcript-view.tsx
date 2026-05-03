'use client'

import { Fragment } from 'react'
import { seekTo, useCurrentTime } from '@/components/playback/playback-store'
import { cn } from '@/lib/utils'
import type { TranscriptParagraph, TranscriptSegments, TranscriptSentence } from '@/lib/ai/transcribe'

/**
 * Interactive transcript pane: paragraphs separated by speaker, sentences
 * are clickable to seek the audio, the active sentence (whichever one
 * `currentTime` falls inside) is highlighted karaoke-style.
 *
 * Auto-scroll is added in Phase 4.
 */
export function TranscriptView({
    segments,
    repSpeakerNumber,
}: {
    segments: TranscriptSegments
    repSpeakerNumber: number | null | undefined
}) {
    const currentTime = useCurrentTime()

    return (
        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto pr-2">
            {segments.paragraphs.map((paragraph, i) => (
                <Paragraph
                    key={i}
                    paragraph={paragraph}
                    currentTime={currentTime}
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
    currentTime,
    isRep,
}: {
    paragraph: TranscriptParagraph
    currentTime: number
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
                        <SentenceButton sentence={sentence} currentTime={currentTime} />{' '}
                    </Fragment>
                ))}
            </p>
        </div>
    )
}

function SentenceButton({ sentence, currentTime }: { sentence: TranscriptSentence; currentTime: number }) {
    const isActive = currentTime >= sentence.start && currentTime < sentence.end
    return (
        <button
            type="button"
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
