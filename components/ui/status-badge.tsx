import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ConversationStatus } from '@/lib/data-access/conversations'

const META: Record<ConversationStatus, { label: string; tone: string; icon: 'spin' | 'check' | 'alert' }> = {
    pending: { label: 'Queued', tone: 'bg-muted text-muted-foreground', icon: 'spin' },
    transcribing: { label: 'Transcribing', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', icon: 'spin' },
    analyzing: {
        label: 'Analyzing',
        tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        icon: 'spin',
    },
    ready: {
        label: 'Ready',
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        icon: 'check',
    },
    failed: {
        label: 'Failed',
        tone: 'bg-destructive/10 text-destructive',
        icon: 'alert',
    },
}

export function StatusBadge({ status, className }: { status: ConversationStatus; className?: string }) {
    const meta = META[status]
    const Icon = meta.icon === 'spin' ? Loader2 : meta.icon === 'check' ? CheckCircle2 : CircleAlert
    return (
        <Badge variant="secondary" className={cn('gap-1.5 font-medium', meta.tone, className)}>
            <Icon className={cn('size-3.5', meta.icon === 'spin' && 'animate-spin')} />
            {meta.label}
        </Badge>
    )
}

export function isProcessing(status: ConversationStatus) {
    return status === 'pending' || status === 'transcribing' || status === 'analyzing'
}
