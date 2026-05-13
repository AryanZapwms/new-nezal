import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: any) {
  const token = await getToken({ req })

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Check admin routes
  if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*", "/checkout/:path*"],
}