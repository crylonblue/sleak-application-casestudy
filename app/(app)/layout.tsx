import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { ConversationsRealtime } from '@/components/realtime/conversations-realtime'
import { requireUser } from '@/lib/data-access/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await requireUser()

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset>{children}</SidebarInset>
            <ConversationsRealtime userId={user.id} />
        </SidebarProvider>
    )
}
