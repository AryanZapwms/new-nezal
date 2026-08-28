// lib/syncUserContact.ts
import { User } from "@/lib/models/user"

interface OrderShippingAddress {
  phone?: string
  street?: string
  city?: string
  state?: string
  zipCode?: string
  pincode?: string
  country?: string
}

// Checkout captures phone/address on the Order only — the User record is
// otherwise never touched, so admin lookups (and the user's own saved
// profile) stay blank forever even after real purchases. Called from every
// order-creation path for logged-in users so the most recent order's contact
// info becomes their saved profile info going forward. Best-effort: a
// failure here must never fail order placement.
export async function syncUserContactFromOrder(
  userId: unknown,
  shippingAddress: OrderShippingAddress | undefined | null
): Promise<void> {
  if (!userId || !shippingAddress) return

  const phone = shippingAddress.phone?.trim()
  const city = shippingAddress.city?.trim()
  if (!phone && !city) return

  try {
    const update: Record<string, unknown> = {}
    if (phone) update.phone = phone
    if (city) {
      update.address = {
        street: shippingAddress.street ?? "",
        city,
        state: shippingAddress.state ?? "",
        zipCode: shippingAddress.zipCode ?? shippingAddress.pincode ?? "",
        country: shippingAddress.country ?? "India",
      }
    }

    await User.findByIdAndUpdate(userId, update)
  } catch (error) {
    console.error("Failed to sync user contact info from order:", error)
  }
}
