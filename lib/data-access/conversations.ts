import { cache } from 'react'
import 'server-only'
import { createClient } from '../supabase/server'
import { requireUser } from './auth'
import type { Feedback } from '../ai/feedback-schema'

export type ConversationStatus = 'pending' | 'transcribing' | 'analyzing' | 'ready' | 'failed'

/**
 * Minimal DTO for list views — keeps payloads small.
 */
export type ConversationListItem = {
    id: string
    title: string
    status: ConversationStatus
    duration_seconds: number | null
    created_at: string
}

export type ConversationDetail = ConversationListItem & {
    recording_path: string | null
    recording_mime: string | null
    transcript: string | null
    analysis: Feedback | null
    error: string | null
    updated_at: string
}

const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * List all conversations owned by the current user.
 * RLS guarantees only the user's own rows come back, but we still pass the
 * user id explicitly to fail closed if the session is unexpectedly absent.
 */
export const getOwnConversations = cache(async (): Promise<ConversationListItem[]> => {
    const user = await requireUser()

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('conversations')
        .select('id, title, status, duration_seconds, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch conversations: ${error.message}`)
    return (data ?? []) as ConversationListItem[]
})

/**
 * Fetch a single conversation owned by the current user.
 * Returns null if the row doesn't exist or isn't theirs (RLS enforces ownership).
 */
export const getOwnConversation = cache(async (id: string): Promise<ConversationDetail | null> => {
    const user = await requireUser()

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('conversations')
        .select(
            'id, title, status, duration_seconds, created_at, updated_at, recording_path, recording_mime, transcript, analysis, error',
        )
        .eq('id', id)
        .eq('created_by', user.id)
        .maybeSingle()

    if (error) throw new Error(`Failed to fetch conversation: ${error.message}`)
    return (data as ConversationDetail | null) ?? null
})

/**
 * Generate a short-lived signed URL for the audio file in the private
 * recordings bucket. Returns null if the recording isn't uploaded yet.
 */
export async function getRecordingSignedUrl(recordingPath: string | null): Promise<string | null> {
    if (!recordingPath) return null
    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from('recordings')
        .createSignedUrl(recordingPath, SIGNED_URL_TTL_SECONDS)
    if (error || !data) return null
    return data.signedUrl
}
