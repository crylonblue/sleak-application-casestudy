import { cache } from 'react'
import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'

// Cached helper methods makes it easy to get the same value in many places
// without manually passing it around. This discourages passing it from Server
// Component to Server Component which minimizes risk of passing it to a Client
// Component.
export const getCurrentUser = cache(async () => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    return user
})

export const requireUser = cache(async () => {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/login')
    return user
})
