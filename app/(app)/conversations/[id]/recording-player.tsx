'use client'

import { registerAudio } from '@/components/playback/playback-store'

/**
 * Thin client wrapper that registers the audio element with the playback
 * store on mount (and unregisters on unmount). Anything else that needs to
 * react to playback — transcript karaoke, segment indicator, segment cards —
 * subscribes via `useCurrentTime()` / `useIsPlaying()` and triggers seeks
 * via `seekTo(seconds)`.
 *
 * Phase 4 will wrap this together with the segment timeline strip in a
 * larger `AudioWithSegments` component.
 */
export function RecordingPlayer({ src }: { src: string }) {
    return (
        <audio ref={registerAudio} controls preload="metadata" className="w-full" src={src}>
            Your browser does not support audio playback.
        </audio>
    )
}
