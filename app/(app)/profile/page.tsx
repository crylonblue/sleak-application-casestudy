import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/data-access/auth'
import { getCurrentProfile } from '@/lib/data-access/profile'
import { ProfileForm } from './profile-form'

export const metadata = {
    title: 'Profile · Sleak',
}

export default async function ProfilePage() {
    const [user, profile] = await Promise.all([requireUser(), getCurrentProfile()])

    return (
        <>
            <SiteHeader breadcrumbs={[{ title: 'Profile' }]} />
            <main className="@container/main flex flex-1 flex-col gap-2">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 lg:px-6">
                    <header className="flex flex-col gap-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
                        <p className="text-muted-foreground text-sm">
                            Your basic information shown across the app.
                        </p>
                    </header>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Personal information</CardTitle>
                            <CardDescription>
                                Email comes from your account; name and company live in the app database.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileForm
                                email={user.email ?? ''}
                                fullName={profile.full_name}
                                companyName={profile.company_name}
                            />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    )
}
