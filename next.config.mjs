// next.config.mjs

// Images are served from Bunny.net's pull zone (see lib/bunny.ts) and resized
// there by Bunny Optimizer through the custom loader in lib/image-loader.ts,
// which reads this hostname (inlined below as NEXT_PUBLIC_BUNNY_HOSTNAME).
const bunnyHostname = (() => {
  try {
    return process.env.BUNNY_PULL_ZONE_URL ? new URL(process.env.BUNNY_PULL_ZONE_URL).hostname : null
  } catch {
    return null
  }
})()

const nextConfig = {
  output: 'standalone',
  // The process.cwd()-based file serving routes (app/api/serve-files etc.)
  // make the tracer pull the whole project into .next/standalone. Keep out
  // what the server never needs at runtime: public/ is copied into the
  // deploy bundle separately by .github/workflows/deploy.yml (so tracing it
  // uploaded it twice), and the rest is dev/test-only material.
  outputFileTracingExcludes: {
    '*': [
      'public/**',
      'tests/**',
      'nezal-seed/**',
      'scripts/**',
      '*.md',
      'errors.txt',
      'products_backup.json',
      'package-lock.json*',
      'tsconfig.tsbuildinfo',
    ],
  },
  serverExternalPackages: ['ioredis'],
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_BUNNY_HOSTNAME: bunnyHostname ?? '',
  },
  images: {
    // Resizing happens at the CDN edge (Bunny Optimizer), not on this server.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
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