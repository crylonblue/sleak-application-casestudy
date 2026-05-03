# Plan: segmented call analysis + karaoke transcript

**Status:** draft. Living doc — update as we iterate. Once shipped, fold the
relevant sections into [[conversations]], [[ai-pipeline]], [[database]] and
delete this file.

**Branch:** `feat/segmented-call-analysis`.

## Why

Today the analysis is one big bucket: a single summary, a single score, a
flat list of strengths and improvements. For a 30-minute call this loses
local context — you see "you didn't ask discovery questions" without
knowing *when* in the call to fix it. Salespeople review their own calls
the way coaches review game tape: scrubbing to specific moments and
asking "what happened here?".

The user-facing target:

- Calls are split into 3–8 logical **segments** (e.g. *Introduction*,
  *Discovery questions*, *Pricing pushback*, *Next steps*).
- Each segment has its own short feedback (what went well, what to fix).
- The audio player shows **which segment we're currently in** as it plays.
- The transcript runs **karaoke-style** — the current word/sentence is
  highlighted as the audio plays, and clicking any sentence seeks the
  player to that point.
- The existing overall summary / score / next-steps stays, since those
  are inherently global.

## Domain model

A **segment** is a contiguous time range inside the call with a single
coaching focus. Segments must:

- Have a short, distinctive title (≤ 5 words, sentence case)
- Have a 1-sentence summary of what happened in the range
- Have `start_seconds` and `end_seconds` (consecutive, no gaps, no
  overlaps; first starts at 0, last ends at the audio duration)
- Have 0–3 strengths and 0–3 improvements scoped to *this segment only*

Segments are AI-determined, not time-based — a 90-second small-talk
intro is one segment regardless of what a fixed window would split it
into. The model decides where the boundaries go based on what's being
discussed.

## Data model changes

Two pieces of data to persist:

### 1. Deepgram timing data → new `transcript_segments` jsonb column

Today we throw away everything except the flat transcript string.
Deepgram already returns word-level (`start`/`end`/`confidence`),
sentence-level (`start`/`end`/`text`) and paragraph-level
(`start`/`end`/`speaker`/`sentences[]`) timing data — see
[[ai-pipeline#transcription]]. We need this for karaoke + click-to-seek.

Migration:

```sql
alter table public.conversations
  add column transcript_segments jsonb;
```

Stored shape (a trimmed projection of Deepgram's response):

```ts
{
  paragraphs: Array<{
    speaker?: number          // 0/1/... from diarize
    start: number
    end: number
    sentences: Array<{
      text: string
      start: number
      end: number
      words: Array<{ word: string; start: number; end: number; confidence?: number }>
    }>
  }>
}
```

Words live under sentences (not flat) so the renderer can iterate
paragraphs → sentences → words without separate joins. Old rows have
`null` here and we degrade gracefully — no karaoke, no click-to-seek.

### 2. AI segments → extend the existing `analysis` jsonb

No migration needed. We add `segments` to `feedbackSchema` and let the
existing column carry it. Old rows whose `analysis` lacks `segments`
fall through to the existing flat view.

### Open question — global strengths/improvements

We currently have `strengths[]` and `improvements[]` at the top level
of `feedbackSchema`. Once those are per-segment, we have a choice:

- **(a) Keep both.** Global = headline 1–2 takeaways; per-segment =
  detail. Mild redundancy; coach sees the "big picture" and the "fix
  this here" view side by side.
- **(b) Drop global strengths/improvements**, keep only `summary`,
  `overall_score`, `next_steps`, plus `segments[]`. Cleaner, but the
  detail page loses the "top callouts" affordance.

Lean: **(a)** — the global view is genuinely different cognitively from
the per-segment view, and salespeople want both. To be confirmed.

## AI prompt + schema changes

### `feedbackSchema` (new shape)

```ts
{
  title: string                                   // existing
  summary: string                                 // existing
  overall_score: number                           // existing
  strengths:    Array<{ point, evidence }>        // existing (kept)
  improvements: Array<{ point, suggestion, evidence }>  // existing (kept)
  next_steps: string[]                            // existing
  segments: Array<{                               // ← new
    title: string                                 // ≤ 5 words, sentence case
    summary: string                               // 1 sentence
    start_seconds: number
    end_seconds: number
    strengths: string[]                           // 0-3, short
    improvements: string[]                        // 0-3, short
  }>
}
```

`zod.refine` constraints we should add:

- `segments.length` between 3 and 8
- `segments[0].start_seconds === 0`
- `segments[i].end_seconds === segments[i+1].start_seconds` (no gaps)
- Last segment's `end_seconds` close to the audio duration (we can pass
  `durationSeconds` into the analyze call and validate)

If validation fails we log and fall back to the old global-only view —
the row's `analysis` simply doesn't carry `segments`, and the detail
page degrades.

### Prompt

Pass the timestamped transcript to the model:

```
Total call duration: 1487.3 seconds.

Transcript (timestamps in seconds):
[0.0–4.2] (speaker 0) Hi, thanks for joining today's call.
[4.5–8.1] (speaker 1) Hi, glad to be here.
[8.5–15.0] (speaker 0) I want to start by understanding...
…
```

System prompt additions:

- "Split the call into 3–8 logical segments. Choose boundaries where
  the topic or activity actually changes (intro, discovery, pricing,
  objection X, next steps, closing). Don't split arbitrarily by time."
- "Segments must cover the entire call from 0 to total duration with no
  gaps or overlaps."
- "Per-segment strengths and improvements should be specific to that
  range; don't repeat the same point across segments."

Token budget: a 30-min call ≈ 5k words ≈ 10k tokens with timestamps;
output ≈ 3k tokens. Comfortably within the 128k window. For 60+ min
calls we'd want chunking — out of scope for this iteration.

## UI changes

### Detail page layout (`app/(app)/conversations/[id]/page.tsx`)

Stays a server component. New ordering:

```
[header: title + status + actions]
[failed alert (if applicable)]
[recording card: audio player + segment indicator]   ← updated
[processing panel (if processing)]
[overall feedback view]                              ← existing
[segment feedback cards]                             ← new
[transcript pane: paragraph/sentence-level, click-to-seek, karaoke]  ← rewritten
```

### Audio + segment indicator (new client component `<AudioWithSegments />`)

- Wraps the existing `<audio>` element.
- Listens to `timeupdate` events.
- Looks up the current segment via binary search on the segments array.
- Renders a small pill above the player: *"Segment 3 of 6 · Pricing
  pushback"*.
- Renders a **timeline strip** under the player — segments laid out
  proportionally with their titles, the current one highlighted. Click
  a segment to seek.

### Segment feedback (`<SegmentFeedback segments={...}/>`)

A vertical list of cards, one per segment. Each card:

- Segment number + title + time range (mm:ss–mm:ss)
- 1-sentence summary
- "What went well" bullets (if any)
- "What to improve" bullets (if any)
- Click anywhere on the card → seek the audio to `start_seconds`

The currently-playing segment's card gets a subtle ring / accent so the
user can find their place.

### Transcript pane (`<Transcript paragraphs={...} currentTime={...} />`)

Replaces the current `<pre>{conversation.transcript}</pre>`.

- Renders paragraphs as blocks. Each paragraph has a speaker label
  (*Rep* / *Customer* — we already have `speaker` from Deepgram, can
  map 0→Rep, 1→Customer; might need a one-time per-call assignment).
- Each sentence is a `<button>` that seeks the audio on click.
- Each word is a `<span>` with `data-start` so we can highlight it.
- Karaoke effect: a parent client component listens to `timeupdate` on
  the audio element via a shared context, finds the active sentence
  (sentence-level highlight is less jittery than word-level), and
  applies a class. Optionally also marks the current word.
- Auto-scroll keeps the active sentence in view, but only if the user
  hasn't scrolled manually within the last few seconds (don't fight
  them).

### Shared playback context

To wire the audio element's `currentTime` to multiple consumers
(segment indicator, segment cards, transcript) without prop drilling
or duplicate listeners, we'll have one `<PlaybackProvider>` that:

- Owns a ref to the `<audio>` element.
- Polls `currentTime` on `timeupdate` (and via `requestAnimationFrame`
  while playing for sub-second updates needed for karaoke).
- Exposes `useCurrentTime()` and `useSeekTo(seconds)` hooks.

This lives in `components/playback/` so it can be reused later (clip
sharing, comments at timestamps, etc).

## Implementation phases

We can ship these in order; each phase is a meaningful improvement on
its own.

### Phase 1 — Persist Deepgram timing data

Foundational. No user-visible change yet.

- Migration: add `transcript_segments` jsonb column.
- `lib/ai/transcribe.ts`: also return the structured `paragraphs`
  payload.
- `app/(app)/conversations/actions.ts`: persist `transcript_segments`
  alongside `transcript`.
- `lib/data-access/conversations.ts`: surface the new column on the
  detail DTO.
- Wiki: update `database.md` and `ai-pipeline.md`.

### Phase 2 — AI-determined segments + per-segment feedback

The model starts producing segmented output; the detail page renders
segment cards.

- `lib/ai/feedback-schema.ts`: add `segments` (with `zod.refine`
  constraints).
- `lib/ai/analyze.ts`: pass timestamped transcript + total duration;
  update system prompt.
- `app/(app)/conversations/[id]/segment-feedback.tsx`: new client
  component.
- Detail page renders segment cards below the overall feedback.
- Wiki: update `ai-pipeline.md`, `conversations.md`.

### Phase 3 — Click-to-seek transcript

The transcript pane becomes interactive without karaoke yet.

- `components/playback/playback-context.tsx`: shared audio context.
- `app/(app)/conversations/[id]/transcript.tsx`: paragraph/sentence
  rendering with seek-on-click.
- Old `<pre>` view becomes the fallback for rows without
  `transcript_segments`.

### Phase 4 — Karaoke highlighting + segment indicator

- Active-sentence highlighting in the transcript driven by
  `currentTime`.
- Auto-scroll with manual-override grace period.
- `<AudioWithSegments />` showing current segment pill + clickable
  segment timeline strip under the audio element.
- The currently-playing segment card gets an accent.

### (Optional) Phase 5 — Word-level karaoke

Sentence-level is enough for the coaching use case. Word-level adds
polish but jitter — only worth it if Phase 4's UX feels too coarse.

## Resolved decisions

1. **Keep global strengths/improvements** alongside per-segment ones.
   Different cognitive views; salespeople want both.
2. **Speaker labeling: GPT infers** which Deepgram speaker number is
   the rep, returned as a `rep_speaker_number` field on the schema.
   Falls back to `0` when the transcript is too sparse to tell.
3. **3–8 segments** with `zod.refine` enforcing contiguous coverage.
4. **Segment cards stacked** below the overall feedback. Simpler,
   mobile-friendly.
5. **Sentence-level karaoke** in Phase 4. Word-level deferred to
   optional Phase 5.
6. **Auto-scroll with 5-second grace** when the user scrolls
   manually.
7. **One LLM call**, not two — overall feedback + segments come back
   in the same `withStructuredOutput` invocation. Cheaper, simpler,
   and the model writing the overall summary benefits from having
   walked through the segments.
8. **Storage split: separate `conversation_transcripts` table** for
   the bulky Deepgram timing data, joined to `conversations` by FK.
   Keeps the main row small so realtime UPDATE events don't drag
   ~150–250 KB per status flip.

## Deferred — not in this branch

- Re-analyze button.
- Multi-call comparison.
- Search across transcripts.
- Sharing a specific timestamp / clip.
- Chunking pipeline for >60-min calls (token budget is fine for
  ≤60 min: ~25 k input + ~5 k output, well within 128 k).

## Risks

- **Bad segment boundaries** — model puts a boundary mid-sentence,
  segments don't actually align with topic shifts, etc. Mitigation:
  evaluate on a few test calls before merging Phase 2; tune the
  prompt; the `zod.refine` rules at least guarantee the *shape* is
  valid even when the *content* is mediocre.
- **Karaoke jitter from imprecise timestamps** — Deepgram's word
  timings aren't always frame-accurate, so the highlight can lag or
  jump. Sentence-level highlighting masks this; it's why we're
  starting there.
- **Performance on very long calls** — 60-min call could have 4000+
  words. Linear scans on every `timeupdate` (4 Hz) are still cheap
  (~16k ops/sec) but if it shows up in profiling, add a binary search
  + window cache.

## Things explicitly out of scope for this branch

- Re-running analysis with new prompts.
- Searching across transcripts.
- Sharing a specific timestamp / clip with a colleague.
- Speaker identification beyond Rep/Customer guess.
- Multi-call comparison ("how have my discovery questions improved
  over the last 10 calls?").
- Chunking pipeline for >60-min calls.

These are all good follow-ups, not blockers.
