'use client'

import { useActionState, useEffect, useId, useState } from 'react'
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
import { uploadConversation, type UploadResult } from './actions'

export function UploadDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [state, formAction, isPending] = useActionState<UploadResult, FormData>(uploadConversation, undefined)
    const fileInputId = useId()
    const titleInputId = useId()

    // The action returns `{ conversationId }` on success and `{ error }` on
    // failure. On success we close the dialog and surface a toast with a
    // "View" action — the user can keep working (start another upload, browse
    // around) while transcription and analysis run in the background. List
    // and detail views update in realtime as the pipeline progresses.
    useEffect(() => {
        if (!state) return
        if ('error' in state) {
            toast.error(state.error)
        } else if ('conversationId' in state) {
            const id = state.conversationId
            toast.success('Recording uploaded — analyzing in the background.', {
                action: { label: 'View', onClick: () => router.push(`/conversations/${id}`) },
            })
            setOpen(false)
        }
    }, [state, router])

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
                        We&apos;ll transcribe with Deepgram and generate coaching feedback with GPT-4.1. Once the file
                        finishes uploading you can close this dialog and keep working — analysis runs in the background.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor={titleInputId}>Title (optional)</Label>
                        <Input
                            id={titleInputId}
                            name="title"
                            placeholder="e.g. Acme Corp · discovery call"
                            disabled={isPending}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor={fileInputId}>Recording</Label>
                        <Input
                            id={fileInputId}
                            name="file"
                            type="file"
                            accept="audio/*"
                            required
                            disabled={isPending}
                            className="cursor-pointer"
                        />
                        <p className="text-muted-foreground text-xs">MP3, M4A, WAV, OGG, or WEBM · up to 100 MB</p>
                    </div>
                    {state && 'error' in state && (
                        <Alert variant="destructive">
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            <UploadCloud />
                            {isPending ? 'Uploading…' : 'Upload'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
