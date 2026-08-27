// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/order"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  await connectDB()
  const order = await Order.findById(id)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  // Orders with a live Shiprocket shipment must be cancelled (via the
  // existing Cancel action, which also cancels the Shiprocket shipment)
  // before they can be deleted — deleting never touches Shiprocket itself.
  if (order.shiprocketOrderId) {
    return NextResponse.json(
      { error: "This order has a Shiprocket shipment. Cancel it first, then delete." },
      { status: 400 }
    )
  }

  await Order.deleteOne({ _id: id })
  return NextResponse.json({ success: true })
}
