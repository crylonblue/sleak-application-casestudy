'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/data-access/auth'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { analyzeTranscript } from '@/lib/ai/analyze'

export type UploadResult = { error: string } | undefined

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

export async function uploadConversation(_prev: UploadResult, formData: FormData): Promise<UploadResult> {
    const user = await requireUser()
    const file = formData.get('file')
    const titleRaw = String(formData.get('title') ?? '').trim()

    if (!(file instanceof File) || file.size === 0) {
        return { error: 'Please choose an audio file to upload.' }
    }
    if (!ALLOWED_MIME.has(file.type)) {
        return { error: `Unsupported file type "${file.type || 'unknown'}". Try MP3, M4A, WAV, OGG, or WEBM.` }
    }
    if (file.size > MAX_BYTES) {
        return { error: 'That file is larger than 100 MB. Please upload a smaller recording.' }
    }

    const title = titleRaw || file.name.replace(/\.[^.]+$/, '') || 'Untitled call'
    const supabase = await createClient()

    // 1) Insert the row first so we have a stable id for the storage path.
    const { data: row, error: insertError } = await supabase
        .from('conversations')
        .insert({
            created_by: user.id,
            title,
            status: 'pending',
            recording_mime: file.type,
            recording_size_bytes: file.size,
        })
        .select('id')
        .single()

    if (insertError || !row) {
        return { error: insertError?.message ?? 'Could not create conversation.' }
    }

    const conversationId = row.id as string
    const ext = extensionFor(file.type, file.name)
    const path = `${user.id}/${conversationId}.${ext}`

    // 2) Upload audio to the private storage bucket.
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
        await supabase.from('conversations').delete().eq('id', conversationId)
        return { error: `Upload failed: ${uploadError.message}` }
    }

    await supabase
        .from('conversations')
        .update({ recording_path: path, status: 'transcribing' })
        .eq('id', conversationId)

    // 3) Transcribe + analyze inline. For an MVP this keeps the flow simple;
    //    a production version would push this into a queue with realtime status.
    try {
        const audio = Buffer.from(arrayBuffer)
        const { transcript, durationSeconds } = await transcribeAudio(audio, file.type)

        await supabase
            .from('conversations')
            .update({ transcript, duration_seconds: durationSeconds, status: 'analyzing' })
            .eq('id', conversationId)

        const analysis = await analyzeTranscript(transcript)

        await supabase
            .from('conversations')
            .update({ analysis, status: 'ready', error: null })
            .eq('id', conversationId)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await supabase.from('conversations').update({ status: 'failed', error: message }).eq('id', conversationId)
    }

    revalidatePath('/conversations')
    revalidatePath(`/conversations/${conversationId}`)
    redirect(`/conversations/${conversationId}`)
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
