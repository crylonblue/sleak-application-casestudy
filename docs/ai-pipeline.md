# AI pipeline

Two services, both invoked from server-only code in `lib/ai/`:

```
audio bytes ──► Deepgram ──► transcript + timing ──► Azure OpenAI ──► structured feedback
```

The pipeline runs in the **background** of `finalizeUpload` via
`after()` from `next/server` — see [[background-pipeline]] for why,
[[upload]] for the surrounding flow.

## Transcription — `lib/ai/transcribe.ts`

`@deepgram/sdk` v5, `nova-3` model, `smart_format`, `punctuate`,
`diarize`, `paragraphs`, `language: 'multi'`.

Returns `{ transcript, durationSeconds, segments }`:

- `transcript` — flat smart-formatted string, also stored on
  `conversations.transcript`.
- `durationSeconds` — total audio duration.
- `segments` — projected `TranscriptSegments` shape:

  ```ts
  {
    paragraphs: Array<{
      speaker?: number
      start: number; end: number
      sentences: Array<{
        text: string
        start: number; end: number
        words: Array<{ word, start, end, confidence? }>
      }>
    }>
  }
  ```

  Words live under sentences (Deepgram returns them flat — we bucket
  them by time range). Persisted in `public.conversation_transcripts`
  ([[database]]).

## Analysis — `lib/ai/analyze.ts`

`@langchain/openai`'s `AzureChatOpenAI` + `withStructuredOutput` against
a zod schema. See [[structured-output]] for the rationale.

```
analyzeTranscript({ segments, durationSeconds }) → Feedback
```

User prompt feeds the model a sentence-level timestamped transcript
plus the total duration. Sentence granularity (not word) keeps the
input token count reasonable. Temperature 0.2 for stability.

Output is post-processed by `repairSegmentBoundaries` to snap segment
ranges back to contiguous coverage (the model occasionally drifts by a
fraction of a second).

## Feedback schema — `lib/ai/feedback-schema.ts`

```ts
{
  title: string                                     // CRM-style
  summary: string
  overall_score: number                             // 0-10
  rep_speaker_number: number                        // GPT infers which Deepgram speaker is the rep
  strengths:    Array<{ point, evidence }>          // ≤ 5  (top across the call)
  improvements: Array<{ point, suggestion, evidence }>  // ≤ 5
  next_steps: string[]
  segments: Array<{                                 // 3–8, contiguous
    title: string                                   // ≤ 5 words
    summary: string
    start_seconds: number; end_seconds: number
    strengths: string[]                             // ≤ 3, this segment only
    improvements: string[]                          // ≤ 3, this segment only
  }>
}
```

`evidence` is meant to be a quote/paraphrase — that's what makes the
feedback feel grounded. The detail page renders it as a left-bordered
italic blockquote.

`title` powers the auto-generated CRM-style title — see [[ai-title]].

The shape lives as the `analysis` jsonb column ([[database]]) and is
re-validated with `feedbackSchema.safeParse` on the detail page.
