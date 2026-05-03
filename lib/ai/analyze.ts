import 'server-only'
import { AzureChatOpenAI } from '@langchain/openai'
import { feedbackSchema, type Feedback } from './feedback-schema'
import type { TranscriptSegments } from './transcribe'

const SYSTEM_PROMPT = `You are an expert sales coach reviewing a recorded sales conversation.
You will receive a timestamped transcript of a sales call, with one line per
sentence in the format:

  [start_seconds–end_seconds] (speaker N) sentence text

Analyze it as if you were giving the salesperson honest, actionable coaching
feedback. Be specific, evidence-based, and constructive. Quote or paraphrase
the transcript when citing evidence. Focus on rapport, discovery, value
articulation, objection handling, and clear next steps.

In addition to overall feedback, split the call into 3–8 logical segments.
Choose segment boundaries where the topic or activity actually changes (intro,
discovery, pricing, objection X, next steps, closing — pick what fits the
specific call). Don't split arbitrarily by time. Per-segment strengths and
improvements should be specific to that range; don't repeat the same point
across segments.

Segments must be contiguous: the first must start at 0, each segment's
end_seconds must equal the next segment's start_seconds, and the last
segment's end_seconds must equal the total call duration.

Identify which Deepgram speaker number is the salesperson and return it as
rep_speaker_number. Infer it from the transcript content. Default to 0 if
the transcript is too sparse to tell.

You will also generate a concise CRM-style title for the call. Make it
specific (who and what topic), not generic. If the transcript is too short
to know, fall back to a sensible neutral title like "Short recording — limited
content".`

let cachedModel: AzureChatOpenAI | null = null
function getModel() {
    if (!cachedModel) {
        const required = [
            'AZURE_OPENAI_API_KEY',
            'AZURE_OPENAI_API_INSTANCE_NAME',
            'AZURE_OPENAI_API_DEPLOYMENT_NAME',
            'AZURE_OPENAI_API_VERSION',
        ]
        for (const k of required) if (!process.env[k]) throw new Error(`${k} is not configured`)

        cachedModel = new AzureChatOpenAI({
            azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
            azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
            temperature: 0.2,
        })
    }
    return cachedModel
}

/**
 * Build the timestamped sentence-level transcript that the model uses to pick
 * segment boundaries. We deliberately use sentence (not word) granularity in
 * the prompt — sentences are what segments boundaries naturally land on, and
 * sending all words would 5–10× the input token count for no quality gain.
 */
function formatTimestampedTranscript(segments: TranscriptSegments): string {
    const lines: string[] = []
    for (const p of segments.paragraphs) {
        for (const s of p.sentences) {
            const speaker = p.speaker ?? '?'
            lines.push(`[${s.start.toFixed(1)}–${s.end.toFixed(1)}] (speaker ${speaker}) ${s.text}`)
        }
    }
    return lines.join('\n')
}

/**
 * Snap segment boundaries so they're guaranteed contiguous, even if the model
 * drifted by a fraction of a second. Cheap insurance — preserves the model's
 * intent (which segment the boundary belongs to) while making downstream code
 * (looking up the active segment by `currentTime`) bug-free.
 */
function repairSegmentBoundaries(feedback: Feedback, totalSeconds: number): Feedback {
    if (!feedback.segments?.length) return feedback
    const sorted = [...feedback.segments].sort((a, b) => a.start_seconds - b.start_seconds)
    const repaired = sorted.map((s) => ({ ...s }))
    repaired[0].start_seconds = 0
    repaired[repaired.length - 1].end_seconds = totalSeconds
    for (let i = 0; i < repaired.length - 1; i++) {
        repaired[i].end_seconds = repaired[i + 1].start_seconds
    }
    return { ...feedback, segments: repaired }
}

export async function analyzeTranscript({
    segments,
    durationSeconds,
}: {
    segments: TranscriptSegments
    durationSeconds: number
}): Promise<Feedback> {
    const model = getModel()
    const structured = model.withStructuredOutput(feedbackSchema, { name: 'sales_call_feedback' })

    const userPrompt =
        `Total call duration: ${durationSeconds.toFixed(1)} seconds.\n\n` +
        `Transcript (timestamps in seconds):\n${formatTimestampedTranscript(segments)}`

    const result = await structured.invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
    ])
    return repairSegmentBoundaries(result, durationSeconds)
}
