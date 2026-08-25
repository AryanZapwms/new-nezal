// lib/bunny.ts
//
// Bunny.net Storage helper — upload/delete/URL parsing.
// Mirrors the API pattern used by nezal-seed/migrate-cloudinary-to-bunny.js
// (PUT/DELETE to the storage endpoint with an AccessKey header, public URLs
// served from the pull zone).
//
// Required env vars: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY,
// BUNNY_STORAGE_HOSTNAME, BUNNY_PULL_ZONE_URL

const {
  BUNNY_STORAGE_ZONE,
  BUNNY_STORAGE_API_KEY,
  BUNNY_STORAGE_HOSTNAME,
  BUNNY_PULL_ZONE_URL,
} = process.env

function assertConfigured() {
  const missing = [
    ["BUNNY_STORAGE_ZONE", BUNNY_STORAGE_ZONE],
    ["BUNNY_STORAGE_API_KEY", BUNNY_STORAGE_API_KEY],
    ["BUNNY_STORAGE_HOSTNAME", BUNNY_STORAGE_HOSTNAME],
    ["BUNNY_PULL_ZONE_URL", BUNNY_PULL_ZONE_URL],
  ].filter(([, v]) => !v).map(([k]) => k)

  if (missing.length) {
    throw new Error(`Bunny.net storage is not configured — missing env var(s): ${missing.join(", ")}`)
  }
}

function pullZone(): string {
  return (BUNNY_PULL_ZONE_URL as string).replace(/\/$/, "")
}

/** True if the given URL points at our Bunny.net pull zone. */
export function isBunnyUrl(url: string): boolean {
  if (!url || !BUNNY_PULL_ZONE_URL) return false
  return url.startsWith(pullZone() + "/")
}

/** "https://<pull-zone>/products/abc/img.jpg" -> "products/abc/img.jpg" */
export function bunnyPathFromUrl(url: string): string {
  const prefix = pullZone() + "/"
  if (!url.startsWith(prefix)) throw new Error(`Not a Bunny.net URL: ${url}`)
  return url.slice(prefix.length)
}

/** Uploads a buffer to Bunny.net Storage at `targetPath` and returns the public pull-zone URL. */
export async function uploadToBunny(
  targetPath: string,
  buffer: Buffer,
  contentType: string = "application/octet-stream"
): Promise<string> {
  assertConfigured()
  const uploadUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${targetPath}`
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { AccessKey: BUNNY_STORAGE_API_KEY as string, "Content-Type": contentType },
    body: buffer,
  })
  if (res.status !== 201) {
    throw new Error(`Bunny.net upload failed (${res.status}): ${await res.text().catch(() => "")}`)
  }
  return `${pullZone()}/${targetPath}`
}

/** Deletes a file from Bunny.net Storage by its storage path (not the public URL). */
export async function deleteFromBunny(targetPath: string): Promise<void> {
  assertConfigured()
  const deleteUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${targetPath}`
  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: { AccessKey: BUNNY_STORAGE_API_KEY as string },
  })
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Bunny.net delete failed (${res.status}): ${await res.text().catch(() => "")}`)
  }
}

/** Deletes a file from Bunny.net Storage given its public pull-zone URL. */
export async function deleteFromBunnyByUrl(url: string): Promise<void> {
  await deleteFromBunny(bunnyPathFromUrl(url))
}
