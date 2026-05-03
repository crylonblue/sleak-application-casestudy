# AI pipeline

Two external services, both invoked from server-only code in `lib/ai/`:

```
audio bytes ──► Deepgram ──► transcript ──► Azure OpenAI ──► structured feedback (zod)
```

The pipeline runs in the **background** of the upload server action via
`after()` from `next/server`. The transcript + analysis flow back to the
row asynchronously and the UI surfaces them via realtime — see
[[conversations#upload-flow]] and
[[decisions#background-pipeline-via-after-plus-supabase-realtime]].

## Transcription — `lib/ai/transcribe.ts`

Uses `@deepgram/sdk` v5 (note: v5 changed its API; the older `createClient` /
`listen.prerecorded` pattern is gone).

```
const client = new DeepgramClient({ apiKey })
const response = await client.listen.v1.media.transcribeFile(
    { data: audio, contentType: mimeType, filename: 'recording' },
    { model: 'nova-3', smart_format: true, punctuate: true,
      diarize: true, paragraphs: true, language: 'multi' },
)
```

Returns `{ transcript, durationSeconds, segments }`:

- `transcript` — the smart-formatted flat string (display fallback,
  also stored on `conversations.transcript`).
- `durationSeconds` — total audio duration; used to validate segment
  bounds and to render duration on the list page.
- `segments` — the structured paragraphs/sentences/words timing data,
  projected from Deepgram's response into our `TranscriptSegments`
  shape:

  ```ts
  {
    paragraphs: Array<{
      speaker?: number
      start: number
      end: number
      sentences: Array<{
        text: string
        start: number
        end: number
        words: Array<{ word, start, end, confidence? }>
      }>
    }>
  }
  ```

  Words live under sentences (Deepgram returns them flat, we bucket
  them by time range during projection). Persisted in
  `public.conversation_transcripts` — see [[database]].

Throws if the response is empty or asynchronous (only synchronous
transcription is wired up).

### Why nova-3 + multi

`nova-3` is Deepgram's current best general model; `language: 'multi'` lets a
single call handle calls that switch languages. Smart-format adds punctuation
and number/date formatting. Diarization labels speakers, which we don't
display today but is cheap to leave on for future use.

## Analysis — `lib/ai/analyze.ts`

Uses `@langchain/openai`'s `AzureChatOpenAI` with `withStructuredOutput` so
the model returns a typed object that matches our zod schema. LangChain
handles the function-calling plumbing.

```
const model = new AzureChatOpenAI({
    azureOpenAIApiKey, azureOpenAIApiInstanceName,
    azureOpenAIApiDeploymentName, azureOpenAIApiVersion,
    temperature: 0.2,
})
const structured = model.withStructuredOutput(feedbackSchema, { name: 'sales_call_feedback' })
const result = await structured.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Transcript:\n\n${transcript}` },
])
```

Temperature is low so the same call gives roughly the same coaching twice.
The model + deployment name are env-driven (currently GPT-4.1 on the
`sleak-ai-assessment-resource` Azure instance).

## Feedback schema — `lib/ai/feedback-schema.ts`

```ts
{
  title: string,                     // 5-9 word CRM-style title
  summary: string,                   // 2-3 sentence overview
  overall_score: number,             // 0-10
  strengths: { point, evidence }[],          // ≤ 5
  improvements: { point, suggestion, evidence }[],  // ≤ 5
  next_steps: string[],              // ≤ 5
}
```

`evidence` is meant to be a quote or paraphrase from the transcript —
that's what makes the feedback feel grounded rather than generic. The
detail page renders evidence as a left-bordered italic blockquote.

`title` powers the auto-generated CRM-style title for the row; the
upload action conditionally adopts it (only if the user hasn't renamed
since upload). See [[conversations#ai-generated-title]].

This shape is stored as the `analysis` jsonb column ([[database]]) and
re-validated with `feedbackSchema.safeParse` when the detail page reads
it.

## See also

- [[conversations]] — how this pipeline is invoked
- [[database]] — where transcript + analysis are persisted
- [[local-setup]] — required env vars
