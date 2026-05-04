import { cache } from 'react'
import 'server-only'
import { createClient } from '../supabase/server'
import { requireUser } from './auth'

/**
 * App-domain profile, kept separate from `auth.users` — see
 * [[decisions/profile-table]]. The trigger on `auth.users` insert means a
 * profile row is guaranteed to exist for every signed-in user, so this
 * helper can return `Profile` (not `Profile | null`) and let downstream
 * code skip the null branch.
 */
export type Profile = {
    id: string
    full_name: string | null
    company_name: string | null
    created_at: string
    updated_at: string
}

export const getCurrentProfile = cache(async (): Promise<Profile> => {
    const user = await requireUser()
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, created_at, updated_at')
        .eq('id', user.id)
        .single()

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
    return data as Profile
})

/**
 * Display label for a user, falling back to email when the profile is
 * still empty (just-signed-up user who hasn't filled in their name yet).
 */
export function profileDisplayName(profile: Profile, fallbackEmail: string | null): string {
    return profile.full_name?.trim() || fallbackEmail || 'Unknown user'
}

/**
 * Two-letter avatar initials, derived from the full name when available
 * and the email local-part otherwise.
 */
export function profileInitials(profile: Profile, fallbackEmail: string | null): string {
    const name = profile.full_name?.trim()
    if (name) {
        const parts = name.split(/\s+/).filter(Boolean)
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    }
    const local = (fallbackEmail ?? '').split('@')[0] ?? ''
    return (local.slice(0, 2) || '??').toUpperCase()
}
