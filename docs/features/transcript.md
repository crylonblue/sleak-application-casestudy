# Transcript

`transcript-view.tsx` — interactive paragraph/sentence-level transcript
on the detail page's Transcript tab.

## What it does

- Renders paragraphs with **Rep / Customer** speaker labels (driven by
  GPT-inferred `rep_speaker_number`; see [[ai-pipeline]]).
- Each sentence is a `<button>` — clicking it seeks the audio via
  `seekTo(sentence.start)`.
- The active sentence (whichever one `currentTime` falls inside) is
  highlighted **karaoke-style** as audio plays.
- **Auto-scroll** keeps the active sentence centered inside the box.
  Pauses for 5 s after the user manually scrolls so we don't fight
  them.

## Two scroll-bug fixes worth knowing about

1. The container has `overscroll-contain` so wheel events at the edges
   don't bubble to the page.
2. Auto-scroll uses **manual `container.scrollTo` math**, not
   `scrollIntoView({ block: 'center' })` — the latter nudged the page
   in some browsers.

## Source data

Comes from `public.conversation_transcripts.paragraphs` (Deepgram's
sentence/word timing data) — see [[database]] and [[storage-shape]].
Word-level timestamps are persisted but only sentence-level highlight
is wired today; word-level would be straightforward to add.

## See also

- [[playback]] — shared playback store
- [[segments]] — same `currentTime` drives the active-segment accent
- [[storage-shape]] — why timing lives in its own table
