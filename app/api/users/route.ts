import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { importedUserFilter, realUserFilter } from "@/lib/imported-users"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    //  SECURITY CHECK: Only admins can fetch users list
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
    }

    await connectDB()

    // Imported review placeholder accounts are hidden unless asked for.
    const includeImported = new URL(request.url).searchParams.get("includeImported") === "true"

    const [users, importedCount] = await Promise.all([
      User.find(includeImported ? {} : realUserFilter()).select("-password").sort({ createdAt: -1 }),
      User.countDocuments(importedUserFilter()),
    ])

    return NextResponse.json(users, { headers: { "X-Imported-User-Count": String(importedCount) } })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
