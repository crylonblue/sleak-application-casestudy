import { redirect } from 'next/navigation'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { getCurrentUser } from '@/lib/data-access/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/login')

    return (
        <SidebarProvider>
            <AppSidebar variant="inset" />
            <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
    )
}
