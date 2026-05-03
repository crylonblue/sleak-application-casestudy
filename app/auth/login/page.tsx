import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signIn } from '../actions'
import { AuthForm } from '../auth-form'
import { getCurrentUser } from '@/lib/data-access/auth'

export const metadata = {
    title: 'Sign in · Sleak',
}

export default async function LoginPage() {
    const user = await getCurrentUser()
    if (user) redirect('/conversations')

    return (
        <AuthForm
            title="Welcome back"
            description="Sign in to review your sales calls."
            action={signIn}
            submitLabel="Sign in"
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="text-foreground underline-offset-4 hover:underline">
                        Sign up
                    </Link>
                </>
            }
        />
    )
}
