import 'server-only'
import { DeepgramClient } from '@deepgram/sdk'

export type TranscriptionResult = {
    transcript: string
    durationSeconds: number | null
}

let cachedClient: DeepgramClient | null = null
function deepgram() {
    if (!cachedClient) {
        const apiKey = process.env.DEEPGRAM_API_KEY
        if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not configured')
        cachedClient = new DeepgramClient({ apiKey })
    }
    return cachedClient
}

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const client = deepgram()
    const response = await client.listen.v1.media.transcribeFile(
        { data: audio, contentType: mimeType, filename: 'recording' },
        {
            model: 'nova-3',
            smart_format: true,
            punctuate: true,
            diarize: true,
            paragraphs: true,
            language: 'multi',
        },
    )

    if (!('results' in response) || !('metadata' in response)) {
        throw new Error('Deepgram returned an async/accepted response — expected synchronous transcription.')
    }

    const alt = response.results?.channels?.[0]?.alternatives?.[0]
    const transcript = alt?.paragraphs?.transcript ?? alt?.transcript ?? ''
    const duration = response.metadata?.duration ?? null

    if (!transcript.trim()) throw new Error('Transcription was empty — is the audio file valid?')

    return { transcript, durationSeconds: duration }
}
