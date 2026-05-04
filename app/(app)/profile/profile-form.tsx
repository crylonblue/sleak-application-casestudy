'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile, type UpdateProfileResult } from './actions'

export function ProfileForm({
    email,
    fullName,
    companyName,
}: {
    email: string
    fullName: string | null
    companyName: string | null
}) {
    const [state, formAction, isPending] = useActionState<UpdateProfileResult, FormData>(
        updateProfile,
        undefined,
    )

    useEffect(() => {
        if (!state) return
        if (state.kind === 'error') toast.error(state.error)
        else if (state.kind === 'success') toast.success('Profile updated')
    }, [state])

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled readOnly />
                <p className="text-muted-foreground text-xs">Email is part of your sign-in and can&apos;t be changed here.</p>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={fullName ?? ''}
                    placeholder="e.g. Jamie Doe"
                    maxLength={200}
                    disabled={isPending}
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="company_name">Company</Label>
                <Input
                    id="company_name"
                    name="company_name"
                    defaultValue={companyName ?? ''}
                    placeholder="e.g. Acme Corp"
                    maxLength={200}
                    disabled={isPending}
                />
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </form>
    )
}
