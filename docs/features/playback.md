# Playback

Custom audio player with the segment timeline merged into the scrubber.
The native `<audio>` chrome is hidden — we render our own controls so
the look is consistent across browsers.

## Components

- `recording-player.tsx` — play/pause button + merged scrubber + time
  readout. The `<audio>` is in the DOM, registered with the playback
  store via `ref={registerAudio}`.
- The store itself (`components/playback/playback-store.ts`) — see
  [[ui#module-level-singletons]].

## The merged scrubber

```
Segment 3 of 6 · Pricing pushback                       (active-segment pill)
┌──────┬───────────┬──────────────╋─────┬───────────────────────┐
│ intro│ discovery │ pricing      ┃     │ next steps │ closing  │
└──────┴───────────┴──────────────╋─────┴───────────────────────┘
0:42                                                       3:14
```

- Track is rendered as proportional **segment blocks** (gray, all
  uniform height). The active block gets a **taller, darker overlay**
  layered on top so it visibly pops.
- Played portion is a thin overlay through the center.
- Current position is a thin **vertical line** — no thumb knob.
- Hovering the track shows a faint guide line plus a tooltip:
  `mm:ss · Segment title` for the spot under the cursor.
- Click to seek; click-and-drag to scrub. ←/→ moves ±5 s when the track
  has focus; space toggles play.

When no segments exist (during processing), the track falls back to a
single uniform bar.

## See also

- [[segments]], [[transcript]] — other consumers of the playback store
- [[ui]] — the playback store contract
