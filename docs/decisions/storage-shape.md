# Where structured data lives

Two AI-output shapes, two different homes.

## `analysis` as a jsonb column on `conversations`

**What:** the structured `Feedback` (summary, score, strengths,
improvements, segments, …) is stored as a `jsonb` column on the
conversations row, not in its own table.

**Why:** always 1:1 with the row, queried on the same page, no
versioning concerns near-term.

**When to revisit:** if we want analysis history (re-run with a newer
model and keep both), comments scoped to specific feedback elements,
or queries *into* the analysis at scale — split it out.

## Transcript timing in its own `conversation_transcripts` table

**What:** Deepgram's structured paragraph/sentence/word timing data
lives in a separate table joined by `conversation_id`, not on the
parent `conversations` row.

**Why:** for a 60-min call this blob is ~150–250 KB. The
`conversations` table is in the `supabase_realtime` publication with
`replica identity full`, which means every UPDATE event carries the
full row across the wire. Keeping the bulky timing data off the row
keeps realtime payloads small.

**Cost:** the detail page does one extra query (cheap, indexed by PK).

**See also:** [[database]], [[ai-pipeline]], [[transcript]],
[[realtime]].
