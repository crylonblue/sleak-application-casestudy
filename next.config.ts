import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            // Audio recordings can be tens of megabytes. Matches the 100 MB
            // ceiling enforced inside `uploadConversation`.
            bodySizeLimit: '100mb',
        },
    },
}

export default nextConfig
