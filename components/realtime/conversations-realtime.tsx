'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to `public.conversations` postgres_changes for the current user
 * and triggers `router.refresh()` whenever a row changes. Mounting this in
 * `(app)/layout.tsx` keeps the subscription alive for the whole authenticated
 * session, so list and detail views update in realtime as the upload action's
 * background pipeline progresses (pending → transcribing → analyzing → ready).
 *
 * Refreshes are debounced to ~250ms so a burst of status changes coalesces
 * into a single re-render.
 */
export function ConversationsRealtime({ userId }: { userId: string }) {
    const router = useRouter()
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel(`conversations:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `created_by=eq.${userId}`,
                },
                () => {
                    if (refreshTimer.current) clearTimeout(refreshTimer.current)
                    refreshTimer.current = setTimeout(() => router.refresh(), 250)
                },
            )
            .subscribe()

        return () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current)
            supabase.removeChannel(channel)
        }
    }, [userId, router])

    return null
}
