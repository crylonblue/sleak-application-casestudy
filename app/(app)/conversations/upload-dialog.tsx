'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'

type AppRouter = ReturnType<typeof useRouter>
import { Loader2, Plus, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { clearUploadProgress, setUploadProgress } from '@/lib/uploads/upload-tracker'
import { cn } from '@/lib/utils'
import { cancelUpload, finalizeUpload, prepareUpload } from './actions'

/**
 * Upload entry point.
 *
 * Picking or dropping a file closes the dialog immediately and hands control
 * to `runUpload`, which manages the entire pipeline (prepare → byte upload →
 * finalize) via a sticky toast in the bottom-right with a live progress bar.
 * The user can keep working — start another upload, navigate elsewhere — and
 * the toast updates in place.
 */
export function UploadDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    const handleFile = (file: File | null | undefined) => {
        if (!file) return
        setOpen(false)
        // Fire-and-forget — runUpload owns its own toast lifecycle, the
        // dialog just initiates the run.
        void runUpload(file, router)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Upload call
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload a sales call</DialogTitle>
                    <DialogDescription>
                        Drop a recording or click to browse. We&apos;ll generate a title, transcript, and coaching
                        feedback in the background — you can keep working while it runs.
                    </DialogDescription>
                </DialogHeader>
                <FileDropzone onFile={handleFile} />
            </DialogContent>
        </Dialog>
    )
}

function FileDropzone({ onFile }: { onFile: (file: File | null | undefined) => void }) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputId = useId()

    return (
        <label
            htmlFor={fileInputId}
            className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
            onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
            }}
            onDragEnter={(e) => {
                e.preventDefault()
                setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                onFile(e.dataTransfer.files[0])
            }}
        >
            <UploadCloud className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">Drop audio file here</p>
            <p className="text-muted-foreground text-xs">
                or click to browse · MP3, M4A, WAV, OGG, WEBM · up to 100 MB
            </p>
            <input
                id={fileInputId}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    // Reset so picking the same file again still triggers onChange.
                    e.target.value = ''
                    onFile(file)
                }}
            />
        </label>
    )
}

/**
 * Run a single upload end-to-end, surfacing progress via one sticky sonner
 * toast that morphs through stages: preparing → uploading (with a live
 * progress bar) → finalizing → success (with a "View" action). Multiple
 * uploads can run in parallel — each gets its own toast id.
 */
async function runUpload(file: File, router: AppRouter) {
    const toastId = `upload-${Math.random().toString(36).slice(2, 9)}`

    toast.custom(
        () => <UploadProgressToast fileName={file.name} progress={0} stage="preparing" />,
        { id: toastId, duration: Infinity },
    )

    const prep = await prepareUpload({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
    })
    if ('error' in prep) {
        toast.error(prep.error, { id: toastId })
        return
    }

    setUploadProgress({
        conversationId: prep.conversationId,
        progress: 0,
        fileSizeBytes: file.size,
        fileName: file.name,
    })

    try {
        await uploadWithProgress({
            url: prep.uploadUrl,
            file,
            onProgress: (p) => {
                toast.custom(
                    () => <UploadProgressToast fileName={file.name} progress={p} stage="uploading" />,
                    { id: toastId, duration: Infinity },
                )
                setUploadProgress({
                    conversationId: prep.conversationId,
                    progress: p,
                    fileSizeBytes: file.size,
                    fileName: file.name,
                })
            },
        })
    } catch (err) {
        clearUploadProgress(prep.conversationId)
        await cancelUpload({ conversationId: prep.conversationId, path: prep.path }).catch(() => {})
        const aborted = err instanceof Error && err.message === 'aborted'
        if (aborted) {
            toast.dismiss(toastId)
        } else {
            const message = err instanceof Error ? err.message : 'Upload failed.'
            toast.error(message, { id: toastId })
        }
        return
    }

    clearUploadProgress(prep.conversationId)

    toast.custom(
        () => <UploadProgressToast fileName={file.name} progress={1} stage="finalizing" />,
        { id: toastId, duration: Infinity },
    )

    const fin = await finalizeUpload({ conversationId: prep.conversationId, path: prep.path })
    if ('error' in fin) {
        toast.error(fin.error, { id: toastId })
        return
    }

    toast.success(`${file.name} uploaded`, {
        id: toastId,
        description: 'Analyzing in the background.',
        action: {
            label: 'View',
            onClick: () => router.push(`/conversations/${prep.conversationId}`),
        },
        duration: 8000,
    })
}

function UploadProgressToast({
    fileName,
    progress,
    stage,
}: {
    fileName: string
    progress: number
    stage: 'preparing' | 'uploading' | 'finalizing'
}) {
    const pct = Math.round(progress * 100)
    const label =
        stage === 'preparing'
            ? 'Preparing upload…'
            : stage === 'finalizing'
              ? 'Finalizing — analysis is starting…'
              : `Uploading · ${pct}%`
    const barValue = stage === 'uploading' ? pct : stage === 'finalizing' ? 100 : 0
    return (
        <div className="bg-popover text-popover-foreground flex w-full flex-col gap-2 rounded-lg border px-4 py-3 shadow-md">
            <div className="flex items-center gap-2 text-sm">
                <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
                <span className="truncate font-medium">{fileName}</span>
            </div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <Progress value={barValue} />
        </div>
    )
}

function uploadWithProgress({
    url,
    file,
    onProgress,
}: {
    url: string
    file: File
    onProgress: (progress: number) => void
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Throttle progress updates to ~10 Hz so we don't re-render the
        // toast on every browser onprogress tick (which fires much faster).
        let lastEmit = 0
        xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return
            const now = Date.now()
            const fraction = e.loaded / e.total
            if (now - lastEmit > 100 || fraction === 1) {
                lastEmit = now
                onProgress(fraction)
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || ''}`.trim()))
        }
        xhr.onerror = () => reject(new Error('Upload failed (network error).'))
        xhr.onabort = () => reject(new Error('aborted'))
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
    })
}
