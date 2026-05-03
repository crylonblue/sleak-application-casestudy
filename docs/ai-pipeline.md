# AI pipeline

Two external services, both invoked from server-only code in `lib/ai/`:

```
audio bytes ──► Deepgram ──► transcript ──► Azure OpenAI ──► structured feedback (zod)
```

The pipeline runs **inline** inside the upload server action — see
[[conversations]] for the surrounding flow and [[decisions]] for why inline
instead of a queue.

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

Returns `{ transcript, durationSeconds }`. We prefer
`paragraphs.transcript` (smart-formatted, with speaker breaks) over the raw
`transcript` field. Throws if the response is empty or asynchronous (only
synchronous transcription is wired up).

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
  summary: string,                   // 2-3 sentence overview
  overall_score: number,             // 0-10
  strengths: { point, evidence }[],          // ≤ 5
  improvements: { point, suggestion, evidence }[],  // ≤ 5
  next_steps: string[],              // ≤ 5
}
```

`evidence` is meant to be a quote or paraphrase from the transcript — that's
what makes the feedback feel grounded rather than generic. The detail page
renders evidence as a left-bordered italic blockquote.

This shape is stored as the `analysis` jsonb column ([[database]]) and
re-validated with `feedbackSchema.safeParse` when the detail page reads it.

## See also

- [[conversations]] — how this pipeline is invoked
- [[database]] — where transcript + analysis are persisted
- [[local-setup]] — required env vars
