'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
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
    const [open, setOpen] = useState(false)
    const [state, formAction, isPending] = useActionState<UploadResult, FormData>(uploadConversation, undefined)
    const formRef = useRef<HTMLFormElement>(null)
    const fileInputId = useId()
    const titleInputId = useId()

    // Surface server-action errors as a toast.
    useEffect(() => {
        if (state?.error) toast.error(state.error)
    }, [state])

    // The action only returns when there is an error; on success it redirects,
    // so the dialog will be unmounted by the navigation. No explicit close needed.

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
                        We&apos;ll transcribe the recording with Deepgram and generate coaching feedback with GPT-4.1.
                        This usually takes 15–30 seconds.
                    </DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={formAction} className="flex flex-col gap-4">
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
                    {state?.error && (
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
                            {isPending ? 'Uploading & analyzing…' : 'Upload'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
