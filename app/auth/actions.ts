'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AuthFormState = { error?: string } | undefined

function readCredentials(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    if (!email || !password) {
        return { error: 'Email and password are required.' }
    }
    return { email, password }
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const creds = readCredentials(formData)
    if ('error' in creds) return creds

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(creds)
    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    redirect('/conversations')
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const creds = readCredentials(formData)
    if ('error' in creds) return creds
    if (creds.password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp(creds)
    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    redirect('/conversations')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/auth/login')
}
