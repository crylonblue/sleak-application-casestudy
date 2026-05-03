import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="bg-muted/30 flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6">
            <div className="flex items-center gap-2">
                <Image src="/sleak_logo.svg" alt="Sleak" width={28} height={28} />
                <span className="font-mono text-lg font-semibold">Sleak</span>
            </div>
            {children}
        </main>
    )
}
