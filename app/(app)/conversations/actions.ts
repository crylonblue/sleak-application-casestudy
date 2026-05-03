'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/data-access/auth'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { analyzeTranscript } from '@/lib/ai/analyze'

export type PrepareUploadResult =
    | { error: string }
    | { conversationId: string; uploadUrl: string; token: string; path: string }

export type FinalizeUploadResult = { error: string } | { conversationId: string }

const ALLOWED_MIME = new Set([
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
])
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

function extensionFor(mime: string, filename: string) {
    const fromName = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : ''
    if (fromName) return fromName
    const map: Record<string, string> = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'm4a',
        'audio/m4a': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/webm': 'webm',
        'audio/ogg': 'ogg',
        'audio/flac': 'flac',
    }
    return map[mime] ?? 'audio'
}

function defaultTitleFromFilename(filename: string) {
    return filename.replace(/\.[^.]+$/, '') || 'Untitled call'
}

/**
 * Step 1 of the upload flow.
 *
 * Validates metadata, inserts the conversation row in `pending` state, and
 * mints a one-time-use signed upload URL pointed at
 * `recordings/<user_id>/<conversation_id>.<ext>`. The browser uses the
 * returned URL to PUT the audio bytes directly to Supabase Storage with
 * native progress events — no audio bytes ever flow through the Next.js
 * Server Action runtime, so the body-size caps are sidestepped entirely.
 */
export async function prepareUpload(metadata: {
    fileName: string
    mimeType: string
    sizeBytes: number
}): Promise<PrepareUploadResult> {
    const user = await requireUser()
    const { fileName, mimeType, sizeBytes } = metadata

    if (!fileName || sizeBytes <= 0) {
        return { error: 'Please choose an audio file to upload.' }
    }
    if (!ALLOWED_MIME.has(mimeType)) {
        return { error: `Unsupported file type "${mimeType || 'unknown'}". Try MP3, M4A, WAV, OGG, or WEBM.` }
    }
    if (sizeBytes > MAX_BYTES) {
        return { error: 'That file is larger than 100 MB. Please upload a smaller recording.' }
    }

    const supabase = await createClient()

    const { data: row, error: insertError } = await supabase
        .from('conversations')
        .insert({
            created_by: user.id,
            title: defaultTitleFromFilename(fileName),
            status: 'pending',
            recording_mime: mimeType,
            recording_size_bytes: sizeBytes,
        })
        .select('id')
        .single()

    if (insertError || !row) {
        return { error: insertError?.message ?? 'Could not create conversation.' }
    }

    const conversationId = row.id as string
    const ext = extensionFor(mimeType, fileName)
    const path = `${user.id}/${conversationId}.${ext}`

    const { data: signed, error: signedError } = await supabase.storage
        .from('recordings')
        .createSignedUploadUrl(path)

    if (signedError || !signed) {
        await supabase.from('conversations').delete().eq('id', conversationId)
        return { error: signedError?.message ?? 'Could not generate upload URL.' }
    }

    return {
        conversationId,
        uploadUrl: signed.signedUrl,
        token: signed.token,
        path,
    }
}

/**
 * Step 2 of the upload flow. Called by the browser once the PUT to the
 * signed URL has completed.
 *
 * Records the storage path on the row, flips status to `transcribing`,
 * and schedules the rest of the pipeline via `after()`. The transcribe +
 * analyze + title-update work all runs after the response is sent.
 */
export async function finalizeUpload({
    conversationId,
    path,
}: {
    conversationId: string
    path: string
}): Promise<FinalizeUploadResult> {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: row, error: rowError } = await supabase
        .from('conversations')
        .select('id, title, recording_mime')
        .eq('id', conversationId)
        .eq('created_by', user.id)
        .maybeSingle()

    if (rowError || !row) {
        return { error: 'Conversation not found.' }
    }

    await supabase
        .from('conversations')
        .update({ recording_path: path, status: 'transcribing' })
        .eq('id', conversationId)

    const filenameDefaultTitle = row.title // captured before the user could rename
    const mimeType = row.recording_mime ?? 'application/octet-stream'

    after(async () => {
        try {
            const { data: blob, error: downloadError } = await supabase.storage
                .from('recordings')
                .download(path)

            if (downloadError || !blob) {
                throw new Error(downloadError?.message ?? 'Failed to download uploaded file.')
            }

            const audio = Buffer.from(await blob.arrayBuffer())
            const { transcript, durationSeconds, segments } = await transcribeAudio(audio, mimeType)

            // Persist the structured timing data in its own table so the
            // bulky paragraphs blob doesn't ride along on every realtime
            // UPDATE event for the parent row. See [[database#realtime]].
            // Surfacing this error matters: without timing data the
            // detail page can't render the transcript or segments.
            const { error: transcriptUpsertError } = await supabase
                .from('conversation_transcripts')
                .upsert({ conversation_id: conversationId, paragraphs: segments.paragraphs })
            if (transcriptUpsertError) {
                throw new Error(`Failed to persist transcript segments: ${transcriptUpsertError.message}`)
            }

            await supabase
                .from('conversations')
                .update({ transcript, duration_seconds: durationSeconds, status: 'analyzing' })
                .eq('id', conversationId)

            // Fall back to the last sentence's end if Deepgram didn't return
            // a duration. analyzeTranscript needs a number for refining
            // segment boundaries.
            const lastEnd =
                segments.paragraphs.at(-1)?.sentences.at(-1)?.end ?? 0
            const totalSeconds = durationSeconds ?? lastEnd
            const analysis = await analyzeTranscript({ segments, durationSeconds: totalSeconds })

            await supabase
                .from('conversations')
                .update({ analysis, status: 'ready', error: null })
                .eq('id', conversationId)

            // Conditionally adopt the AI-generated title — only if the title
            // still equals the filename-derived default (i.e. the user hasn't
            // renamed in the meantime).
            if (analysis.title) {
                await supabase
                    .from('conversations')
                    .update({ title: analysis.title })
                    .eq('id', conversationId)
                    .eq('title', filenameDefaultTitle)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            await supabase
                .from('conversations')
                .update({ status: 'failed', error: message })
                .eq('id', conversationId)
        }
    })

    revalidatePath('/conversations')
    return { conversationId }
}

/**
 * Best-effort cleanup if the browser-side upload aborts or fails after
 * `prepareUpload`. Removes the partially uploaded object (if any) and
 * deletes the row so the user doesn't accumulate ghost entries.
 */
export async function cancelUpload({
    conversationId,
    path,
}: {
    conversationId: string
    path?: string
}) {
    const user = await requireUser()
    const supabase = await createClient()

    if (path) {
        try {
            await supabase.storage.from('recordings').remove([path])
        } catch {
            // ignore — the object may not exist if the upload never started
        }
    }

    await supabase.from('conversations').delete().eq('id', conversationId).eq('created_by', user.id)
    revalidatePath('/conversations')
}

export async function renameConversation(id: string, formData: FormData) {
    const user = await requireUser()
    const title = String(formData.get('title') ?? '').trim()
    if (!title) return { error: 'Title cannot be empty.' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id)
        .eq('created_by', user.id)

    if (error) return { error: error.message }

    revalidatePath('/conversations')
    revalidatePath(`/conversations/${id}`)
}

export async function deleteConversation(id: string) {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: row } = await supabase
        .from('conversations')
        .select('recording_path')
        .eq('id', id)
        .eq('created_by', user.id)
        .maybeSingle()

    if (row?.recording_path) {
        await supabase.storage.from('recordings').remove([row.recording_path])
    }

    const { error } = await supabase.from('conversations').delete().eq('id', id).eq('created_by', user.id)
    if (error) return { error: error.message }

    revalidatePath('/conversations')
    redirect('/conversations')
}
