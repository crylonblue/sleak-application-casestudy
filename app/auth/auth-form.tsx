'use client'

import { ReactNode } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { type AuthFormState } from './actions'

type Props = {
    title: string
    description: string
    submitLabel: string
    action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
    footer: ReactNode
}

export function AuthForm({ title, description, submitLabel, action, footer }: Props) {
    const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(action, undefined)

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            minLength={8}
                            required
                        />
                    </div>
                    {state?.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="mt-2 flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Working…' : submitLabel}
                    </Button>
                    <p className="text-muted-foreground text-center text-xs">{footer}</p>
                </CardFooter>
            </form>
        </Card>
    )
}
