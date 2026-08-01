// app/api/email/send/route.ts
import { sendEmail, getOrderConfirmationEmail, getPaymentFailedEmail } from "@/lib/email"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, to, subject, data } = body

    let html = ""
    switch (type) {
      case "order-confirmation":
        html = getOrderConfirmationEmail(data)
        break
      case "payment-failed":
        html = getPaymentFailedEmail(data)
        break
      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    const sent = await sendEmail({ to, subject, html })

    if (sent) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  } catch (error) {
    console.error("[v0] Email API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    )
  }
}