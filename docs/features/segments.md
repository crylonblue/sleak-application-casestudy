# Segments

GPT splits each call into **3–8 logical segments** (e.g. *Discovery
questions*, *Pricing pushback*) with per-segment summaries, strengths,
and improvements. The model picks boundaries where the topic actually
changes — not at fixed time intervals.

See [[ai-pipeline]] for the schema + how they're produced.

## Detail-page surface

Two surfaces share the same data:

- **Merged scrubber** inside the Recording card — the active segment is
  rendered as a taller, darker overlay over the proportional segment
  blocks. See [[playback]].
- **Segments tab** below the scrubber — a single-open accordion. The
  currently-playing segment auto-expands. Clicking another segment
  opens it and **suspends auto-follow for 8 seconds** so playback
  can't yank the user back mid-read. Each panel has a *Jump to mm:ss*
  button.

## Contiguous-coverage invariant

Segments must cover the call from `0` to `durationSeconds` with no gaps
or overlaps. The model occasionally drifts by a fraction of a second;
`analyze.ts` snaps boundaries back to contiguity before persisting.

## See also

- [[ai-pipeline]] — schema + analyze flow
- [[playback]] — the merged scrubber
- [[transcript]] — sentence-level karaoke that uses the same playback store
