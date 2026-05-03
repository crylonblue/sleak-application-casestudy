'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useUploadProgress } from '@/lib/uploads/upload-tracker'
import type { ConversationStatus } from '@/lib/data-access/conversations'

/**
 * Status panel that shows a unified progression for an in-flight conversation:
 *
 *   Uploading 42%  →  Transcribing…  →  Analyzing…
 *
 * For `status='pending'`, if the local upload tracker has progress for this
 * conversation (because the upload dialog is currently uploading bytes in
 * this tab), we render the byte-level progress bar. Otherwise we just say
 * the recording is queued — a fallback for tabs that didn't initiate the
 * upload but landed on this page during the pending window.
 */
export function ProcessingPanel({
    conversationId,
    status,
}: {
    conversationId: string
    status: ConversationStatus
}) {
    const upload = useUploadProgress(conversationId)

    if (status === 'pending' && upload) {
        const pct = Math.round(upload.progress * 100)
        const uploadedMb = (upload.fileSizeBytes * upload.progress) / (1024 * 1024)
        const totalMb = upload.fileSizeBytes / (1024 * 1024)
        return (
            <Card>
                <CardContent className="flex flex-col gap-3 py-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <Loader2 className="text-muted-foreground size-5 animate-spin" />
                        <p className="text-muted-foreground text-sm">
                            Uploading <span className="text-foreground font-medium">{upload.fileName}</span>…
                        </p>
                        <span className="text-muted-foreground ml-auto tabular-nums text-xs">
                            {uploadedMb.toFixed(1)} / {totalMb.toFixed(1)} MB · {pct}%
                        </span>
                    </div>
                    <Progress value={pct} />
                </CardContent>
            </Card>
        )
    }

    if (status !== 'pending' && status !== 'transcribing' && status !== 'analyzing') {
        return null
    }

    const message =
        status === 'transcribing'
            ? 'Transcribing your call with Deepgram…'
            : status === 'analyzing'
              ? 'Generating coaching feedback with GPT-4.1…'
              : 'Recording uploaded — getting things ready…'

    return (
        <Card>
            <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
                <p className="text-muted-foreground text-sm">{message}</p>
            </CardContent>
        </Card>
    )
}
