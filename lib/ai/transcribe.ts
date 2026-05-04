import 'server-only'
import { DeepgramClient } from '@deepgram/sdk'

/**
 * Per-sentence timing data, used for click-to-seek transcript and karaoke
 * highlighting. Words live under sentences so the renderer can iterate
 * paragraphs → sentences → words without separate joins.
 */
export type TranscriptWord = {
    word: string
    start: number
    end: number
    confidence?: number
}

export type TranscriptSentence = {
    text: string
    start: number
    end: number
    words: TranscriptWord[]
}

export type TranscriptParagraph = {
    speaker?: number
    start: number
    end: number
    sentences: TranscriptSentence[]
}

export type TranscriptSegments = {
    paragraphs: TranscriptParagraph[]
}

export type TranscriptionResult = {
    transcript: string
    durationSeconds: number | null
    segments: TranscriptSegments
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

export type TranscribeOptions = {
    /**
     * Domain-specific terms to boost during recognition (proper names,
     * brands, jargon). Maps to Deepgram's `keyterm` parameter — Nova-3
     * only, up to 100 entries. We pass the rep's name + company from
     * the profile so they come through correctly in the transcript.
     */
    keyterms?: string[]
}

export async function transcribeAudio(
    audio: Buffer,
    mimeType: string,
    options: TranscribeOptions = {},
): Promise<TranscriptionResult> {
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
            ...(options.keyterms && options.keyterms.length > 0 ? { keyterm: options.keyterms } : {}),
        },
    )

    if (!('results' in response) || !('metadata' in response)) {
        throw new Error('Deepgram returned an async/accepted response — expected synchronous transcription.')
    }

    const alt = response.results?.channels?.[0]?.alternatives?.[0]
    const transcript = alt?.paragraphs?.transcript ?? alt?.transcript ?? ''
    const duration = response.metadata?.duration ?? null

    if (!transcript.trim()) throw new Error('Transcription was empty — is the audio file valid?')

    const segments = buildSegments(alt)
    return { transcript, durationSeconds: duration, segments }
}

/**
 * Project Deepgram's response into our `TranscriptSegments` shape:
 * paragraphs → sentences (with text + range) → words (intersected by time
 * range from the flat `words[]` array).
 */
function buildSegments(alt: unknown): TranscriptSegments {
    const a = alt as
        | {
              paragraphs?: {
                  paragraphs?: Array<{
                      speaker?: number
                      start?: number
                      end?: number
                      sentences?: Array<{ text?: string; start?: number; end?: number }>
                  }>
              }
              words?: Array<{ word?: string; start?: number; end?: number; confidence?: number }>
          }
        | undefined

    const rawParagraphs = a?.paragraphs?.paragraphs ?? []
    const rawWords = a?.words ?? []

    // Words are flat in Deepgram's response. We bucket them into the
    // owning sentence by [start, end] range. Tiny tolerance to absorb
    // floating-point boundary cases at sentence edges.
    const TOLERANCE = 0.01
    let cursor = 0

    const paragraphs: TranscriptParagraph[] = rawParagraphs.map((p) => ({
        speaker: p.speaker,
        start: p.start ?? 0,
        end: p.end ?? 0,
        sentences: (p.sentences ?? []).map((s) => {
            const sStart = s.start ?? 0
            const sEnd = s.end ?? 0
            const words: TranscriptWord[] = []
            // Walk forward from the cursor; once we pass sEnd, the rest of
            // rawWords belongs to a later sentence, so we stop.
            while (cursor < rawWords.length) {
                const w = rawWords[cursor]
                const wStart = w.start ?? 0
                const wEnd = w.end ?? 0
                if (wStart < sStart - TOLERANCE) {
                    cursor++
                    continue
                }
                if (wStart > sEnd + TOLERANCE) break
                if (w.word) {
                    words.push({ word: w.word, start: wStart, end: wEnd, confidence: w.confidence })
                }
                cursor++
            }
            return { text: s.text ?? '', start: sStart, end: sEnd, words }
        }),
    }))

    return { paragraphs }
}
