import Link from 'next/link'
import { Mic } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getOwnConversations } from '@/lib/data-access/conversations'
import { UploadDialog } from './upload-dialog'

export const metadata = {
    title: 'Conversations · Sleak',
}

function formatDuration(seconds: number | null) {
    if (seconds == null) return '—'
    const total = Math.round(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

export default async function ConversationsPage() {
    const conversations = await getOwnConversations()

    return (
        <>
            <SiteHeader breadcrumbs={[{ title: 'Conversations' }]} />
            <main className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
                            <p className="text-muted-foreground text-sm">
                                Upload sales call recordings and review AI-generated coaching feedback.
                            </p>
                        </div>
                        <UploadDialog />
                    </div>

                    {conversations.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="bg-card overflow-hidden rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {conversations.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/conversations/${c.id}`}
                                                    className="hover:underline focus:underline focus:outline-none"
                                                >
                                                    {c.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={c.status} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {formatDuration(c.duration_seconds)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(c.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>
        </>
    )
}

function EmptyState() {
    return (
        <div className="bg-card flex flex-col items-center justify-center gap-3 rounded-lg border px-6 py-16 text-center">
            <div className="bg-muted text-muted-foreground rounded-full p-3">
                <Mic className="size-6" />
            </div>
            <h2 className="text-lg font-semibold">No conversations yet</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
                Upload your first sales call recording and Sleak will transcribe it and surface coaching feedback you
                can act on.
            </p>
            <div className="mt-2">
                <UploadDialog />
            </div>
        </div>
    )
}
