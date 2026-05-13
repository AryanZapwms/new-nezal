// app/order-success/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { trackPurchase } from "@/lib/facebook-pixel"
import { useSession } from "next-auth/react"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export default function OrderSuccessPage() {
  const params = useParams()
  const orderId = params.id as string
  const { data: session } = useSession()
  const [orderData, setOrderData] = useState<any>(null)

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-602275335/U1R3CO3tn6wbEIf8l58C',
        'transaction_id': orderId
      })
    }
  }, [orderId])

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrderData(data)

          if (data?.items && data?.totalAmount) {
            const productIds = data.items.map((item: any) => item.product?._id || item.product)
            trackPurchase(
              orderId,
              data.totalAmount,
              data.items.length,
              productIds,
              session?.user?.email
            )
          }
        }
      } catch (error) {
        console.error('Error fetching order data:', error)
      }
    }

    if (orderId) {
      fetchOrderData()
    }
  }, [orderId, session?.user?.email])

  return (
    <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-[--color-border] rounded-2xl shadow-sm bg-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-[--color-text-heading]">Order Placed Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-[--color-text-body]">Thank you for your purchase. Your order has been confirmed.</p>

          <div className="bg-[--color-bg-cream] p-4 rounded-xl">
            <p className="text-sm text-[--color-text-muted]">Order ID</p>
            <p className="font-mono font-semibold text-[--color-text-heading]">{orderId}</p>
          </div>

          <p className="text-sm text-[--color-text-muted]">
            You will receive an email confirmation shortly with tracking information.
          </p>

          <div className="space-y-3 pt-4">
            <Link href={`/profile/orders/${orderId}`} className="block">
              <Button className="w-full bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-semibold py-5 rounded-xl">
                View Your Order Details
              </Button>
            </Link>
            <Link href="/shop" className="block">
              <Button variant="outline" className="w-full border-[--color-border] text-[--color-text-heading] hover:bg-[--color-bg-cream] py-4 rounded-xl">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}