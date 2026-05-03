# UI

Tailwind v4 + shadcn/ui ("new-york" style, zinc base, Lucide icons).
Geist Sans/Mono. Light + dark via oklch CSS variables in
`app/globals.css`.

## shadcn config — `components.json`

`style: "new-york"`, `baseColor: "zinc"`, `iconLibrary: "lucide"`. Add
new primitives with `pnpm dlx shadcn@latest add <name>`.

## Primitives in use

| Component | Where |
|---|---|
| Card / Header / Content / Footer | auth forms, detail page sections |
| Table | conversations list |
| Tabs | detail page (Segments / Coach / Transcript) |
| Accordion | per-segment feedback (single-open, follows playback) |
| Dialog | upload, rename, delete confirm |
| Badge / StatusBadge | row status indicators |
| Alert | inline error messages |
| Sonner (`Toaster`) | toast notifications, mounted in root layout |
| Avatar / DropdownMenu | NavUser |
| Sidebar (full set) | app shell |
| Breadcrumb | SiteHeader |
| Progress | upload toast progress bar |
| Skeleton | sidebar menu skeleton |
| Slider | unused at the moment, kept for future |

## Layout shell

```
app/layout.tsx              ← <html>, fonts, Toaster
└── app/auth/layout.tsx     ← centered card, logo only
    or app/(app)/layout.tsx ← SidebarProvider + AppSidebar + ConversationsRealtime + children
        └── feature pages
```

Sidebar is `collapsible="offcanvas"` with three sections: header (logo
+ brand), `NavMain` (active-state nav), `NavUser` (current-user
dropdown driven by `getCurrentUser()` — see [[auth]]).

## Module-level singletons

Two tiny stores share the same shape — module scope + Set of listeners
+ `useSyncExternalStore`:

- **Playback store** (`components/playback/playback-store.ts`) owns the
  audio element on the current page and broadcasts `currentTime`,
  `duration`, and `isPlaying`. `seekTo(seconds)` and `togglePlay()`
  control it. The `<audio>` element registers via `ref={registerAudio}`.
  Used by [[playback]], [[transcript]], [[segments]].
- **Upload tracker** (`lib/uploads/upload-tracker.ts`) — see
  [[upload-progress-tracker]].

Both are per-tab; they survive client-side navigation but don't sync
across tabs.

## SiteHeader

`components/site-header.tsx` — sticky top bar with sidebar trigger and a
breadcrumb. Pages pass `breadcrumbs={[{ title, link? }, ...]}`.
