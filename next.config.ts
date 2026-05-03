import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    experimental: {
        // Audio recordings can be tens of megabytes. Two stacked Next 16 caps
        // need to be lifted from their defaults; both also have to live under
        // `experimental` for this Next 16.0.7 runtime schema to accept them.
        // See docs/decisions.md for the full ladder.
        //
        // 1) Proxy/middleware buffer cap (default 10 MB) — without this,
        //    larger uploads get truncated and parse as
        //    "Unexpected end of form".
        proxyClientMaxBodySize: '100mb',
        serverActions: {
            // 2) Server Action body cap (default 1 MB) — matches the action's
            //    own MAX_BYTES validation.
            bodySizeLimit: '100mb',
        },
    },
}

export default nextConfig
