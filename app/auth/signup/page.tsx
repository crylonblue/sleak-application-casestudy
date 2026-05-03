import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signUp } from '../actions'
import { AuthForm } from '../auth-form'
import { getCurrentUser } from '@/lib/data-access/auth'

export const metadata = {
    title: 'Create account · Sleak',
}

export default async function SignupPage() {
    const user = await getCurrentUser()
    if (user) redirect('/conversations')

    return (
        <AuthForm
            title="Create your account"
            description="Upload a sales call and get AI feedback in seconds."
            action={signUp}
            submitLabel="Create account"
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-foreground underline-offset-4 hover:underline">
                        Sign in
                    </Link>
                </>
            }
        />
    )
}
