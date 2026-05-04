'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/data-access/auth'
import { createClient } from '@/lib/supabase/server'

export type UpdateProfileResult =
    | { kind: 'success' }
    | { kind: 'error'; error: string }
    | undefined

const MAX_LEN = 200

export async function updateProfile(
    _prev: UpdateProfileResult,
    formData: FormData,
): Promise<UpdateProfileResult> {
    const user = await requireUser()

    const fullName = clean(formData.get('full_name'))
    const companyName = clean(formData.get('company_name'))

    if (fullName && fullName.length > MAX_LEN) {
        return { kind: 'error', error: 'Full name is too long.' }
    }
    if (companyName && companyName.length > MAX_LEN) {
        return { kind: 'error', error: 'Company name is too long.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, company_name: companyName })
        .eq('id', user.id)

    if (error) return { kind: 'error', error: error.message }

    // The sidebar's NavUser reads from the profile too, so revalidate the
    // shared layout in addition to the profile page.
    revalidatePath('/profile')
    revalidatePath('/', 'layout')
    return { kind: 'success' }
}

function clean(value: FormDataEntryValue | null): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
}
