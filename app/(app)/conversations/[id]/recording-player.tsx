'use client'

import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import {
    registerAudio,
    seekTo,
    togglePlay,
    useCurrentTime,
    useDuration,
    useIsPlaying,
} from '@/components/playback/playback-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedbackSegment } from '@/lib/ai/feedback-schema'

/**
 * Custom audio player with the segment timeline merged into the scrubber.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  Segment 3 of 6 · Pricing pushback                               │
 *   │  ▶  ┌─────────┬──────────┬──────╋────┬───────────────────────┐  │
 *   │     │  intro  │ discovery│ ...  ┃    │ next steps │ closing  │  │
 *   │     └─────────┴──────────┴──────╋────┴───────────────────────┘  │
 *   │     0:42                                                  3:14  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * The track shows each segment as a coloured block proportional to its
 * duration. Played portion is darkened on top. The current position is a
 * thin vertical line (no thumb knob). Hover anywhere on the track shows a
 * faint guide line and a tooltip with the time and segment title at that
 * x-coordinate.
 *
 * Click anywhere to seek; click-and-drag to scrub.
 *
 * The native `<audio>` chrome is hidden — we render our own controls so
 * the look is consistent across browsers and integrated with the rest of
 * the shadcn UI.
 */
export function RecordingPlayer({ src, segments }: { src: string; segments?: FeedbackSegment[] }) {
    const currentTime = useCurrentTime()
    const duration = useDuration()
    const isPlaying = useIsPlaying()

    const isReady = duration > 0
    const playFraction = isReady ? Math.min(1, Math.max(0, currentTime / duration)) : 0

    const activeIndex =
        segments && segments.length > 0
            ? segments.findIndex(
                  (s) => currentTime >= s.start_seconds && currentTime < s.end_seconds,
              )
            : -1

    return (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
            <audio ref={registerAudio} preload="metadata" src={src} className="hidden">
                Your browser does not support audio playback.
            </audio>

            {segments && segments.length > 0 && (
                <div className="flex items-center gap-2 px-12 text-xs">
                    {activeIndex >= 0 ? (
                        <>
                            <span className="text-muted-foreground tabular-nums">
                                Segment {activeIndex + 1} of {segments.length}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-foreground font-medium">{segments[activeIndex].title}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">{segments.length} segments</span>
                    )}
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    onClick={togglePlay}
                    disabled={!isReady}
                    size="icon"
                    className="size-10 shrink-0 rounded-full"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
                </Button>

                <div className="flex flex-1 flex-col gap-1.5">
                    <Scrubber
                        currentTime={currentTime}
                        duration={duration}
                        isReady={isReady}
                        playFraction={playFraction}
                        segments={segments}
                        activeIndex={activeIndex}
                    />
                    <div className="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span>{isReady ? formatTime(duration) : '—:—'}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Scrubber({
    currentTime,
    duration,
    isReady,
    playFraction,
    segments,
    activeIndex,
}: {
    currentTime: number
    duration: number
    isReady: boolean
    playFraction: number
    segments?: FeedbackSegment[]
    activeIndex: number
}) {
    const [hoverTime, setHoverTime] = useState<number | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const isDraggingRef = useRef(false)

    const seekFromClientX = (clientX: number) => {
        if (!trackRef.current || !isReady) return
        const rect = trackRef.current.getBoundingClientRect()
        const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        seekTo(fraction * duration)
    }
    const updateHoverFromClientX = (clientX: number) => {
        if (!trackRef.current || !isReady) {
            setHoverTime(null)
            return
        }
        const rect = trackRef.current.getBoundingClientRect()
        const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        setHoverTime(fraction * duration)
    }
    const onMouseDown = (e: React.MouseEvent) => {
        if (!isReady) return
        isDraggingRef.current = true
        seekFromClientX(e.clientX)
        const onMove = (ev: MouseEvent) => {
            if (isDraggingRef.current) seekFromClientX(ev.clientX)
        }
        const onUp = () => {
            isDraggingRef.current = false
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    const hoveredSegment =
        hoverTime != null && segments
            ? segments.find((s) => hoverTime >= s.start_seconds && hoverTime < s.end_seconds)
            : null
    const hoverFraction = hoverTime != null && duration > 0 ? hoverTime / duration : null

    return (
        <div
            ref={trackRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={isReady ? Math.floor(duration) : 0}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={isReady ? 0 : -1}
            className={cn(
                'relative h-4 select-none',
                isReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded',
            )}
            onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
            onMouseLeave={() => setHoverTime(null)}
            onMouseDown={onMouseDown}
            onKeyDown={(e) => {
                if (!isReady) return
                if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    seekTo(currentTime - 5)
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    seekTo(currentTime + 5)
                } else if (e.key === ' ') {
                    e.preventDefault()
                    togglePlay()
                }
            }}
        >
            {/* Track background — uniform-height segment blocks. Both active */}
            {/* and inactive blocks render at the same h-1.5 here so the */}
            {/* borders between blocks line up cleanly; the active block's */}
            {/* visual emphasis comes from a separate taller, darker overlay */}
            {/* rendered on top below. */}
            <div className="absolute inset-x-0 top-1/2 flex h-1.5 -translate-y-1/2 overflow-hidden rounded-full">
                {segments && segments.length > 0 ? (
                    segments.map((s, i) => {
                        const width = duration > 0 ? ((s.end_seconds - s.start_seconds) / duration) * 100 : 0
                        return (
                            <div
                                key={i}
                                style={{ width: `${width}%` }}
                                className="bg-muted-foreground/25 h-full border-r border-background last:border-r-0"
                            />
                        )
                    })
                ) : (
                    <div className="bg-muted-foreground/25 h-full w-full" />
                )}
            </div>

            {/* Active segment accent — taller and darker so the user can see */}
            {/* at a glance which segment they are in. Sits between the base */}
            {/* blocks and the played overlay so the played overlay still */}
            {/* shows progress through the active block. */}
            {activeIndex >= 0 && segments && segments[activeIndex] && duration > 0 && (
                <div
                    style={{
                        left: `${(segments[activeIndex].start_seconds / duration) * 100}%`,
                        width: `${
                            ((segments[activeIndex].end_seconds - segments[activeIndex].start_seconds) /
                                duration) *
                            100
                        }%`,
                    }}
                    className="bg-primary/35 pointer-events-none absolute inset-y-0 rounded-sm transition-[left,width] duration-200"
                />
            )}

            {/* Played overlay — thin line through the centre. Stays at h-1.5 */}
            {/* so it reads as a "progress streak" running through whatever */}
            {/* (taller) active block it crosses. */}
            <div
                className="bg-primary/45 pointer-events-none absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-l-full"
                style={{ width: `${playFraction * 100}%` }}
            />

            {/* Current position — thin vertical line, no thumb knob */}
            <div
                className="bg-primary pointer-events-none absolute inset-y-0 w-0.5 rounded-full"
                style={{ left: `calc(${playFraction * 100}% - 1px)` }}
            />

            {/* Hover guide line + tooltip */}
            {hoverFraction != null && (
                <>
                    <div
                        className="bg-foreground/30 pointer-events-none absolute inset-y-0 w-px"
                        style={{ left: `${hoverFraction * 100}%` }}
                    />
                    <div
                        className="bg-popover text-popover-foreground pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
                        style={{ left: `${hoverFraction * 100}%` }}
                    >
                        <span className="tabular-nums">{formatTime(hoverTime!)}</span>
                        {hoveredSegment && (
                            <>
                                <span className="text-muted-foreground"> · </span>
                                <span>{hoveredSegment.title}</span>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function formatTime(seconds: number) {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const total = Math.floor(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}
