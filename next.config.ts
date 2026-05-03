import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Default 10 MB cap on the proxy/middleware request body would truncate
    // larger audio uploads before the Server Action ever sees them, manifesting
    // as a multipart "Unexpected end of form" error.
    proxyClientMaxBodySize: '100mb',
    experimental: {
        serverActions: {
            // Audio recordings can be tens of megabytes. Matches the 100 MB
            // ceiling enforced inside `uploadConversation`.
            bodySizeLimit: '100mb',
        },
    },
}

export default nextConfig
