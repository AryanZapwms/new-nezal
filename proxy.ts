import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: any) {
  const token = await getToken({ req })

  if (!token) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*", "/checkout/:path*"],
}