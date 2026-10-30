// lib/fastrr-customers.ts
//
// Saves the customer behind a confirmed Shiprocket Custom Checkout (Fastrr)
// order as a User, so they show up in /admin/users, and links the order to
// it. Called from lib/shiprocket-checkout-order.ts once an order is paid or
// COD — abandoned or failed prepaid attempts never create a customer.
//
// The record can't be logged into until the customer claims it: no password,
// isVerified false. Signing up with the same email (register leaves the
// record alone and verify-otp updates it in place), Google sign-in, or a
// password reset verifies it and keeps its _id, so the orders linked here
// stay attached. Linking is safe for the same reason the guestEmail match in
// lib/order-access.ts is: nobody gets a session for this record without
// proving they own the inbox.
//
// When the customer skips email, Shiprocket sends <phone>@fastrr.com. That is
// stored as the email (User.email is required and unique) and recognised by
// isFastrrPlaceholderEmail. Customers are matched by email only, never phone.

import { User } from "@/lib/models/user"
import { Order } from "@/lib/models/order"
import { isImportedEmail } from "@/lib/imported-users"

// Defined in lib/fastrr-email.ts so browser code can use it; re-exported here
// for existing callers.
export { FASTRR_PLACEHOLDER_EMAIL_REGEX, isFastrrPlaceholderEmail } from "@/lib/fastrr-email"

// The order's email, or the same placeholder Shiprocket uses when it sent none.
function customerEmailFor(order: any, phone: string | undefined): string | null {
  const email = typeof order.guestEmail === "string" ? order.guestEmail.trim().toLowerCase() : ""
  if (email.includes("@")) return email
  return phone ? `${phone}@fastrr.com` : null
}

/**
 * Find-or-create the order's customer and link the order to them. Safe to
 * call repeatedly and concurrently for the same order. Never throws — a
 * failure here is logged and must not hold up the order itself.
 */
export async function saveFastrrCustomer(order: any): Promise<void> {
  try {
    // Already linked: a verified account matched at insert, or an earlier call.
    if (order.user) return

    const shipping = order.shippingAddress ?? {}
    const phone: string | undefined = order.guestPhone || shipping.phone || undefined
    const email = customerEmailFor(order, phone)
    if (!email || isImportedEmail(email)) {
      console.warn(`[fastrr-customers] Order ${order.orderNumber} has no usable email or phone — no customer saved`)
      return
    }

    const address = {
      street: shipping.street || shipping.address,
      city: shipping.city,
      state: shipping.state,
      zipCode: shipping.zipCode || shipping.pincode,
      country: shipping.country,
    }
    const hasAddress = Boolean(address.street || address.city)

    let user: any
    let created = false
    try {
      // email comes from the filter on insert.
      const res: any = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            name: order.guestName?.trim() || "Customer",
            ...(phone && { phone }),
            ...(hasAddress && { address }),
            source: "fastrr",
            isVerified: false,
            role: "user",
            marketingConsent: false,
          },
        },
        { upsert: true, returnDocument: "after", includeResultMetadata: true }
      )
      user = res.value
      created = !res.lastErrorObject?.updatedExisting
    } catch (err: any) {
      // Two orders from the same customer at once: the unique email index
      // lets one insert win; the other reads it.
      if (err?.code !== 11000) throw err
      user = await User.findOne({ email })
      if (!user) throw err
    }

    // An existing account only gains what it's missing. Its name, role,
    // password and verification are never touched.
    if (!created) {
      if (phone) await User.updateOne({ _id: user._id, phone: { $in: [null, ""] } }, { $set: { phone } })
      if (hasAddress) {
        await User.updateOne(
          { _id: user._id, "address.street": { $in: [null, ""] }, "address.city": { $in: [null, ""] } },
          { $set: { address } }
        )
      }
    }

    await Order.updateOne({ _id: order._id, user: null }, { $set: { user: user._id } })
  } catch (err) {
    console.error(`[fastrr-customers] Could not save the customer for order ${order?.orderNumber}:`, err)
  }
}
