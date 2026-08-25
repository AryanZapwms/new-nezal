// next.config.mjs

// Images are served from Bunny.net's pull zone (see lib/bunny.ts). Doesn't
// error right now because unoptimized:true skips domain validation, but
// derive it from the same env var anyway for when optimization is turned
// back on, rather than hardcoding the hostname.
const bunnyHostname = (() => {
  try {
    return process.env.BUNNY_PULL_ZONE_URL ? new URL(process.env.BUNNY_PULL_ZONE_URL).hostname : null
  } catch {
    return null
  }
})()

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    qualities: [75, 90],   // ← added: allow both 75 (default) and 90
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nezal.com',
      },
      {
        protocol: 'https',
        hostname: 'care.nezal.com',
      },
      ...(bunnyHostname ? [{ protocol: 'https', hostname: bunnyHostname }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-files/uploads/:path*',
      },
      {
        source: '/arrivals/:path*',
        destination: '/api/serve-files/arrivals/:path*',
      },
      {
        source: '/blogs/:path*',
        destination: '/api/serve-files/blogs/:path*',
      },
      {
        source: '/carousel/:path*',
        destination: '/api/serve-files/carousel/:path*',
      },
      {
        source: '/fonts/:path*',
        destination: '/api/serve-files/fonts/:path*',
      },
      {
        source: '/shop-by-concern/:path*',
        destination: '/api/serve-files/shop-by-concern/:path*',
      },
    ];
  },
}

export default nextConfig