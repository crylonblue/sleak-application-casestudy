'use client'

import { useSyncExternalStore } from 'react'

/**
 * Module-level tracker for in-flight uploads.
 *
 * The browser is the only place that knows real upload progress (the server
 * doesn't see the bytes — they go straight to Supabase Storage via a signed
 * URL). The upload dialog publishes progress here keyed by `conversationId`,
 * and any client component on the same tab can subscribe via
 * `useUploadProgress(id)` to render it.
 *
 * State is plain module scope so it survives client-side navigation between
 * routes, but it is per-tab — a different tab won't see this tab's uploads.
 */
export type UploadProgress = {
    conversationId: string
    progress: number // 0-1
    fileSizeBytes: number
    fileName: string
}

const state = new Map<string, UploadProgress>()
const listeners = new Set<() => void>()

function notify() {
    listeners.forEach((l) => l())
}

export function setUploadProgress(p: UploadProgress) {
    // Always create a new object so consumers comparing references re-render.
    state.set(p.conversationId, { ...p })
    notify()
}

export function clearUploadProgress(conversationId: string) {
    if (state.delete(conversationId)) notify()
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function useUploadProgress(conversationId: string): UploadProgress | undefined {
    return useSyncExternalStore(
        subscribe,
        () => state.get(conversationId),
        () => undefined, // SSR snapshot
    )
}
