// next.config.mjs
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
      // ── also needed: your images are served from Cloudinary,
      //    but it's missing from remotePatterns. Doesn't error
      //    right now because unoptimized:true skips domain
      //    validation, but add it anyway for when you eventually
      //    turn optimization back on. ──────────────────────────
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
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