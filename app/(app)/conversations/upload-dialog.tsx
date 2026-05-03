'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { clearUploadProgress, setUploadProgress } from '@/lib/uploads/upload-tracker'
import { cancelUpload, finalizeUpload, prepareUpload } from './actions'

type UploadState =
    | { kind: 'idle' }
    | { kind: 'preparing' }
    | { kind: 'uploading'; progress: number; conversationId: string; path: string }
    | { kind: 'finalizing'; conversationId: string }
    | { kind: 'error'; message: string }

const isBusyState = (s: UploadState) =>
    s.kind === 'preparing' || s.kind === 'uploading' || s.kind === 'finalizing'

export function UploadDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [state, setState] = useState<UploadState>({ kind: 'idle' })
    const xhrRef = useRef<XMLHttpRequest | null>(null)
    const fileInputId = useId()

    const isBusy = isBusyState(state)

    // Abort any in-flight upload when the component unmounts (e.g. user
    // navigated away) so we don't leave a zombie XHR running.
    useEffect(() => {
        return () => {
            xhrRef.current?.abort()
        }
    }, [])

    const reset = () => {
        setFile(null)
        setState({ kind: 'idle' })
        xhrRef.current = null
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || isBusy) return

        setState({ kind: 'preparing' })
        const prep = await prepareUpload({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
        })
        if ('error' in prep) {
            setState({ kind: 'error', message: prep.error })
            toast.error(prep.error)
            return
        }

        const { conversationId, uploadUrl, path } = prep
        setState({ kind: 'uploading', progress: 0, conversationId, path })
        setUploadProgress({ conversationId, progress: 0, fileSizeBytes: file.size, fileName: file.name })

        try {
            await uploadWithProgress({
                url: uploadUrl,
                file,
                xhrRef,
                onProgress: (p) => {
                    setState({ kind: 'uploading', progress: p, conversationId, path })
                    setUploadProgress({
                        conversationId,
                        progress: p,
                        fileSizeBytes: file.size,
                        fileName: file.name,
                    })
                },
            })
        } catch (err) {
            const aborted = err instanceof Error && err.message === 'aborted'
            clearUploadProgress(conversationId)
            await cancelUpload({ conversationId, path }).catch(() => {})
            if (aborted) {
                reset()
                return
            }
            const message = err instanceof Error ? err.message : 'Upload failed.'
            setState({ kind: 'error', message })
            toast.error(message)
            return
        }

        setState({ kind: 'finalizing', conversationId })
        const fin = await finalizeUpload({ conversationId, path })
        // Clear the upload tracker now that the bytes are server-side. The
        // detail page will fall through to the "Recording uploaded — getting
        // things ready…" message until status flips to transcribing.
        clearUploadProgress(conversationId)
        if ('error' in fin) {
            setState({ kind: 'error', message: fin.error })
            toast.error(fin.error)
            return
        }

        toast.success('Upload complete — analyzing in the background.', {
            action: { label: 'View', onClick: () => router.push(`/conversations/${conversationId}`) },
        })
        setOpen(false)
        reset()
    }

    const onCancelClick = async () => {
        if (state.kind === 'uploading') {
            xhrRef.current?.abort() // triggers the catch in onSubmit which calls cancelUpload
            return
        }
        if (!isBusy) {
            setOpen(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o && isBusy) return // block close while uploading
                setOpen(o)
                if (!o) reset()
            }}
        >
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
                        We&apos;ll generate a title, transcript, and coaching feedback in the background. Once the
                        upload finishes you can close this dialog and keep working.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor={fileInputId}>Recording</Label>
                        <Input
                            id={fileInputId}
                            type="file"
                            accept="audio/*"
                            required
                            disabled={isBusy}
                            className="cursor-pointer"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                        <p className="text-muted-foreground text-xs">MP3, M4A, WAV, OGG, or WEBM · up to 100 MB</p>
                    </div>

                    <UploadStatus state={state} fileSizeBytes={file?.size ?? 0} />

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancelClick}
                            disabled={state.kind === 'preparing' || state.kind === 'finalizing'}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!file || isBusy}>
                            <UploadCloud />
                            {state.kind === 'preparing' && 'Preparing…'}
                            {state.kind === 'uploading' && `Uploading ${Math.round(state.progress * 100)}%`}
                            {state.kind === 'finalizing' && 'Finalizing…'}
                            {(state.kind === 'idle' || state.kind === 'error') && 'Upload'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function UploadStatus({ state, fileSizeBytes }: { state: UploadState; fileSizeBytes: number }) {
    if (state.kind === 'error') {
        return (
            <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
            </Alert>
        )
    }
    if (state.kind === 'preparing') {
        return <p className="text-muted-foreground text-sm">Preparing upload…</p>
    }
    if (state.kind === 'finalizing') {
        return <p className="text-muted-foreground text-sm">Finalizing — analysis is starting…</p>
    }
    if (state.kind === 'uploading') {
        const pct = Math.round(state.progress * 100)
        const uploadedMb = (fileSizeBytes * state.progress) / (1024 * 1024)
        const totalMb = fileSizeBytes / (1024 * 1024)
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uploading…</span>
                    <span className="text-muted-foreground tabular-nums">
                        {uploadedMb.toFixed(1)} / {totalMb.toFixed(1)} MB · {pct}%
                    </span>
                </div>
                <Progress value={pct} />
            </div>
        )
    }
    return null
}

function uploadWithProgress({
    url,
    file,
    xhrRef,
    onProgress,
}: {
    url: string
    file: File
    xhrRef: React.MutableRefObject<XMLHttpRequest | null>
    onProgress: (progress: number) => void
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(e.loaded / e.total)
        }
        xhr.onload = () => {
            xhrRef.current = null
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || ''}`.trim()))
        }
        xhr.onerror = () => {
            xhrRef.current = null
            reject(new Error('Upload failed (network error).'))
        }
        xhr.onabort = () => {
            xhrRef.current = null
            reject(new Error('aborted'))
        }
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
    })
}
