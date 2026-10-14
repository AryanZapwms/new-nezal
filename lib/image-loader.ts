// lib/image-loader.ts
//
// next/image custom loader (wired up via images.loaderFile in next.config.mjs).
// Images on the Bunny pull zone get ?width=&quality= so Bunny Optimizer resizes
// and re-encodes them (WebP where the browser supports it) at the CDN edge, and
// next/image's srcset hands each device a right-sized file instead of the full
// original. Bunny Optimizer must be enabled on the pull zone for this to shrink
// anything — until it is, Bunny ignores the params and serves the original, so
// this is safe to ship first.
//
// Everything else — local /public files, /uploads etc. served by
// app/api/serve-files, SVGs, other hosts — is returned untouched. (In `next dev`
// that makes next/image log a one-time "loader does not implement width"
// warning per such src; it's dev-only and expected.)

// Inlined at build time from BUNNY_PULL_ZONE_URL (see next.config.mjs). The
// *.b-cdn.net check covers the default pull-zone hostname even if it's unset.
const BUNNY_HOSTNAME = process.env.NEXT_PUBLIC_BUNNY_HOSTNAME

function isBunnyHostname(hostname: string) {
  return (!!BUNNY_HOSTNAME && hostname === BUNNY_HOSTNAME) || hostname.endsWith(".b-cdn.net")
}

export default function bunnyImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return src // relative path → local file, served as-is
  }

  if (!isBunnyHostname(url.hostname) || url.pathname.toLowerCase().endsWith(".svg")) {
    return src
  }

  // URL keeps any existing params (e.g. the product page's ?v= cache-buster)
  url.searchParams.set("width", String(width))
  url.searchParams.set("quality", String(quality || 75))
  return url.toString()
}
