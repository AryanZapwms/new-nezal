// promos/[id]/route.ts
import { connectDB } from "@/lib/db"
import { Promo } from "@/lib/models/promo"
import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const { id } = await params

    const promo = await Promo.findById(id)

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(promo)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch promo" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
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

    const promo = await Promo.findByIdAndUpdate(
      id,
      {
        title: body.title,
        message: body.message,
        link: body.link || "",
        linkText: body.linkText || "",
        backgroundColor: body.backgroundColor || "#000000",
        textColor: body.textColor || "#ffffff",
        isActive: body.isActive ?? true,
        priority: body.priority || 0,
      },
      { new: true }
    )

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(promo)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update promo" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
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

    const promo = await Promo.findByIdAndDelete(id)

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Promo deleted successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    )
  }
}