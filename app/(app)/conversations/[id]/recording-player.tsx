'use client'

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
import { Slider } from '@/components/ui/slider'

/**
 * Custom audio player. The `<audio>` element is in the DOM (registered with
 * the playback store via the callback ref) but its native UI is hidden so
 * we can render our own consistent shadcn-styled controls — and so the
 * Recording card looks the same in every browser.
 *
 * State is driven entirely through the playback store, so the transcript
 * pane, segment cards, and segment timeline stay in sync without any extra
 * wiring.
 */
export function RecordingPlayer({ src }: { src: string }) {
    const currentTime = useCurrentTime()
    const duration = useDuration()
    const isPlaying = useIsPlaying()

    const isReady = duration > 0
    const fraction = isReady ? Math.min(1, Math.max(0, currentTime / duration)) : 0

    return (
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2">
            <audio ref={registerAudio} preload="metadata" src={src} className="hidden">
                Your browser does not support audio playback.
            </audio>

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
                <Slider
                    value={[fraction * 1000]}
                    onValueChange={(v) => seekTo((v[0] / 1000) * duration)}
                    max={1000}
                    step={1}
                    disabled={!isReady}
                    aria-label="Seek"
                />
                <div className="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{isReady ? formatTime(duration) : '—:—'}</span>
                </div>
            </div>
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
