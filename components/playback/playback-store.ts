'use client'

import { useSyncExternalStore } from 'react'

/**
 * Tiny module-level singleton that owns "the audio element on the current
 * page" and broadcasts its `currentTime` and play/pause state to anything
 * that wants to subscribe.
 *
 * Usage:
 *   <audio ref={registerAudio} src={...} controls />
 *
 * Then any client component on the same page can call `useCurrentTime()`
 * to re-render on every `timeupdate`, or `seekTo(seconds)` to scrub.
 *
 * One element at a time — registering a second audio element replaces the
 * first. There's only ever one audio player on the detail page anyway.
 *
 * Same shape as `lib/uploads/upload-tracker.ts` — module scope + Set of
 * listeners + `useSyncExternalStore`.
 */

let audioEl: HTMLAudioElement | null = null
let currentTime = 0
let isPlaying = false
const listeners = new Set<() => void>()

function notify() {
    listeners.forEach((l) => l())
}

const onTime = () => {
    if (!audioEl) return
    currentTime = audioEl.currentTime
    notify()
}
const onPlay = () => {
    isPlaying = true
    notify()
}
const onPause = () => {
    isPlaying = false
    notify()
}

export function registerAudio(el: HTMLAudioElement | null) {
    if (audioEl === el) return
    if (audioEl) {
        audioEl.removeEventListener('timeupdate', onTime)
        audioEl.removeEventListener('seeking', onTime)
        audioEl.removeEventListener('seeked', onTime)
        audioEl.removeEventListener('play', onPlay)
        audioEl.removeEventListener('pause', onPause)
    }
    audioEl = el
    if (el) {
        el.addEventListener('timeupdate', onTime)
        el.addEventListener('seeking', onTime)
        el.addEventListener('seeked', onTime)
        el.addEventListener('play', onPlay)
        el.addEventListener('pause', onPause)
        currentTime = el.currentTime
        isPlaying = !el.paused
    } else {
        currentTime = 0
        isPlaying = false
    }
    notify()
}

export function seekTo(seconds: number) {
    if (!audioEl) return
    audioEl.currentTime = Math.max(0, seconds)
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function useCurrentTime(): number {
    return useSyncExternalStore(
        subscribe,
        () => currentTime,
        () => 0,
    )
}

export function useIsPlaying(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => isPlaying,
        () => false,
    )
}
