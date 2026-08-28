// app/api/users/[id]/route.ts
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      )
    }

    await connectDB()

    const { id } = await params
    const body = await request.json()

    // Role is intentionally never accepted here — this endpoint is for
    // general profile edits only. Promoting/demoting an admin needs its own
    // deliberate, confirmed flow, not a field on a quick-edit form.
    const { name, email, phone, address, city, state, pincode, isActive } = body

    if (typeof name === "string" && !name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
    }
    if (typeof email === "string" && !email.trim()) {
      return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 })
    }

    const update: Record<string, any> = {}
    if (typeof name === "string") update.name = name.trim()
    if (typeof email === "string") update.email = email.trim().toLowerCase()
    if (typeof phone === "string") update.phone = phone.trim()
    if (typeof isActive === "boolean") update.isActive = isActive
    if (address !== undefined || city !== undefined || state !== undefined || pincode !== undefined) {
      update.address = {
        street: address ?? "",
        city: city ?? "",
        state: state ?? "",
        zipCode: pincode ?? "",
        country: "India",
      }
    }

    const user = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select("-password")

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      )
    }

    await connectDB()

    const { id } = await params

    const user = await User.findByIdAndDelete(id)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "User deleted successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}