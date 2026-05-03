# UI

Tailwind v4 + shadcn/ui ("new-york" style, zinc base, Lucide icons), Geist
Sans/Mono, light + dark theme via oklch CSS variables in `app/globals.css`.

## shadcn config

`components.json`:
- `style: "new-york"`
- `baseColor: "zinc"`
- `iconLibrary: "lucide"`
- aliases: `@/components`, `@/lib`, `@/components/ui`, etc.

To add more primitives: `pnpm dlx shadcn@latest add <name>`.

## Components in use

| Component | Where |
|---|---|
| Card / CardHeader / CardContent / CardFooter | auth forms, detail page sections |
| Table | conversations list |
| Badge | status indicator (`status-badge.tsx`) |
| Dialog | upload, rename, delete confirm |
| Alert | inline error messages |
| Button / Input / Label | forms throughout |
| Avatar / DropdownMenu | `NavUser` |
| Sidebar (full set) | app shell |
| Sonner (`Toaster`) | toast notifications, mounted in root layout |
| Breadcrumb | `SiteHeader` |
| Skeleton | sidebar menu skeleton |
| Progress | upload-dialog progress bar, processing-panel upload phase |

## Playback store

`components/playback/playback-store.ts` is a tiny module-level store
(same shape as `lib/uploads/upload-tracker.ts`) that owns "the audio
element on the current page" and broadcasts its `currentTime` /
play-pause state to anything that subscribes via `useCurrentTime()` /
`useIsPlaying()`. Components that want to scrub call `seekTo(seconds)`.

The detail page mounts a single `<audio ref={registerAudio}/>` inside
`RecordingPlayer`. The transcript view, segment cards, and (in Phase 4)
the segment timeline all read from this store without any
context/provider plumbing — keeping them as ordinary client components
that can be used à la carte.

## Layout shell

```
app/layout.tsx                  ← <html>, fonts, Toaster
└── app/auth/layout.tsx         ← centered card, logo only
    or app/(app)/layout.tsx     ← SidebarProvider + AppSidebar + SidebarInset
        └── feature pages
```

The sidebar is `collapsible="offcanvas"` with three sections:
- `SidebarHeader` — logo + brand
- `SidebarContent` → `NavMain` — primary nav (Conversations only for now)
- `SidebarFooter` → `NavUser` — current user dropdown

`NavMain` (`components/sidebar/nav-main.tsx`) is a client component that
reads `usePathname()` to set `isActive` on the matching link.

`NavUser` (`components/sidebar/nav-user.tsx`) is a server component that
calls `getCurrentUser()` ([[auth]]). Sign-out is a `<form action={signOut}>`
inside the dropdown.

## SiteHeader

`components/site-header.tsx` — sticky top bar with a sidebar trigger and a
breadcrumb. Pages pass `breadcrumbs={[{ title, link? }, ...]}`. With more
than 3 items it collapses the middle into a dropdown.

## Status badge

`components/ui/status-badge.tsx` exports `<StatusBadge status={...}/>` plus
`isProcessing(status)`. Five states with distinct colors and icons (spinner
for processing states). See [[conversations]] for how it's wired.

## Themes

Dark mode is set up but not toggled. The CSS variables and `.dark` selector
in `globals.css` are present; you'd just need a theme toggle component to
expose it. `next-themes` is installed (it's a dependency of the Sonner
shadcn component).

## See also

- [[architecture]] — route group split that this layout depends on
- [[auth]] — what `NavUser` consumes
- [[conversations]] — primary feature using these components
