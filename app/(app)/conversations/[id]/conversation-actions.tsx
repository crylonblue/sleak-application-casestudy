'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { deleteConversation, renameConversation } from '../actions'

export function ConversationActions({ id, currentTitle }: { id: string; currentTitle: string }) {
    return (
        <div className="flex items-center gap-2">
            <RenameButton id={id} currentTitle={currentTitle} />
            <DeleteButton id={id} title={currentTitle} />
        </div>
    )
}

function RenameButton({ id, currentTitle }: { id: string; currentTitle: string }) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState(currentTitle)
    const [isPending, startTransition] = useTransition()

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (o) setTitle(currentTitle)
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pencil />
                    Rename
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename conversation</DialogTitle>
                    <DialogDescription>Give this call a more descriptive title.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="rename-title">Title</Label>
                    <Input
                        id="rename-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isPending}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isPending || !title.trim() || title.trim() === currentTitle}
                        onClick={() => {
                            const fd = new FormData()
                            fd.set('title', title.trim())
                            startTransition(async () => {
                                const result = await renameConversation(id, fd)
                                if (result?.error) {
                                    toast.error(result.error)
                                } else {
                                    toast.success('Title updated')
                                    setOpen(false)
                                }
                            })
                        }}
                    >
                        {isPending ? 'Saving…' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function DeleteButton({ id, title }: { id: string; title: string }) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 />
                    Delete
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete conversation?</DialogTitle>
                    <DialogDescription>
                        This will permanently delete <span className="font-medium">{title}</span>, its recording, and
                        the AI feedback. This can&apos;t be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => {
                            startTransition(async () => {
                                const result = await deleteConversation(id)
                                if (result?.error) {
                                    toast.error(result.error)
                                }
                                // On success the action redirects, so this dialog unmounts.
                            })
                        }}
                    >
                        {isPending ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
