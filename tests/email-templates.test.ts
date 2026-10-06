// The customer emails were landing in Gmail's Spam folder. These pin the
// properties that keep them out: plain subjects, inline-only HTML with a
// text alternative, links to our own domain only, and no emoji.
import { describe, it, expect } from "vitest"
import {
  getOrderConfirmationEmail,
  getOrderStatusUpdateEmail,
  getOrderCancelledEmail,
  getPaymentFailedEmail,
  getAbandonedPaymentEmail,
  getWelcomeEmail,
  getOtpEmail,
  getAdminOrderNotificationEmail,
  htmlToText,
  orderSummaryFields,
  type EmailContent,
} from "@/lib/email-templates"

const items = [
  { name: "Rose Soap", quantity: 2, price: 100, selectedSize: { size: "Small", unit: "g", quantity: 75, price: 120 } },
  { name: "Neem Face Wash", quantity: 1, price: 250 },
]

const codOrder = {
  shippingAmount: 60,
  codCharge: 40,
  discountAmount: 50,
  couponCode: "WELCOME50",
  paymentMethod: "cod",
  shiprocketPaymentType: null,
  shippingAddress: {
    name: "Asha Sharma",
    phone: "9000000000",
    street: "12 Example Street",
    city: "Pune",
    state: "Maharashtra",
    zipCode: "411001",
    country: "India",
  },
}

const confirmation = getOrderConfirmationEmail({
  customerName: "Asha Sharma",
  orderId: "ORD-1001",
  items,
  total: 500,
  orderDate: "6 October 2026",
  ...orderSummaryFields(codOrder),
})

const emails: Record<string, EmailContent> = {
  confirmation,
  statusUpdate: getOrderStatusUpdateEmail({
    customerName: "Asha Sharma",
    orderId: "ORD-1001",
    orderStatus: "shipped",
    items,
    paymentStatus: "completed",
    totalAmount: 500,
  }),
  cancelled: getOrderCancelledEmail({
    customerName: "Asha Sharma",
    orderNumber: "ORD-1001",
    totalAmount: 500,
    reason: "Requested by customer",
    refundInitiated: true,
  }),
  paymentFailed: getPaymentFailedEmail({ customerName: "Asha Sharma", orderId: "ORD-1001", totalAmount: 500, reason: "Declined" }),
  abandonedPayment: getAbandonedPaymentEmail({ customerName: "Asha Sharma", orderId: "ORD-1001", totalAmount: 500 }),
  welcome: getWelcomeEmail("Asha Sharma"),
  otp: getOtpEmail("Asha Sharma", "482913"),
}

const EMOJI = /\p{Extended_Pictographic}|[✓✔✕✗]/u

describe.each(Object.entries(emails))("%s email", (_name, email) => {
  it("has a plain subject: no emoji, exclamation marks or shouting", () => {
    expect(email.subject).not.toMatch(EMOJI)
    expect(email.subject).not.toContain("!")
    expect(email.subject).not.toMatch(/\b[A-Z]{4,}\b/)
  })

  it("uses inline-only HTML with nothing loaded from outside", () => {
    expect(email.html).not.toMatch(/<style|<script|<link|@import|@font-face/i)
    expect(email.html).not.toMatch(EMOJI)
  })

  it("links only to nezalherbocare.com and gives every image alt text", () => {
    const hrefs = [...email.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.length).toBeLessThanOrEqual(3)
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/nezalherbocare\.com(\/|$)/)

    const images = email.html.match(/<img\b[^>]*>/g) ?? []
    expect(images).toHaveLength(1)
    expect(images[0]).toMatch(/alt="[^"]+"/)
    expect(images[0]).toContain('src="https://nezalherbocare.com/')
  })

  it("carries the same content as plain text, with the company footer", () => {
    expect(email.text).not.toMatch(/<[a-z]/i)
    for (const part of [email.html, email.text]) {
      expect(part).toContain("Nezal Herbocare Private Limited")
      expect(part).toContain("Kandivali East, Mumbai 400101")
      expect(part).toContain("info@nezalherbocare.com")
      expect(part).toContain("+91 7710076400")
      expect(part).toContain("Reply to this email for help.")
    }
  })
})

describe("order confirmation", () => {
  it("has the subject customers and filters will see", () => {
    expect(confirmation.subject).toBe("Your Nezal order ORD-1001 is confirmed")
  })

  it("shows items, charges, payment and address in both parts", () => {
    for (const part of [confirmation.html, confirmation.text]) {
      expect(part).toContain("Rose Soap")
      expect(part).toContain("Small (75 g)")
      expect(part).toContain("₹450.00") // subtotal
      expect(part).toContain("Discount (WELCOME50)")
      expect(part).toContain("-₹50.00")
      expect(part).toContain("₹60.00") // shipping
      expect(part).toContain("Cash on delivery charge")
      expect(part).toContain("₹40.00")
      expect(part).toContain("Cash on delivery")
      expect(part).toContain("₹500.00 payable on delivery")
      expect(part).toContain("12 Example Street")
      expect(part).toContain("Pune, Maharashtra 411001")
      expect(part).toContain("Expected delivery")
    }
  })

  it("reports a paid online order as paid, with free shipping and no COD charge", () => {
    const paid = getOrderConfirmationEmail({
      customerName: "Asha",
      orderId: "ORD-1002",
      items,
      total: 450,
      paymentStatus: "completed",
      ...orderSummaryFields({ paymentMethod: "ccavenue", shippingAmount: 0, codCharge: 0 }),
    })
    expect(paid.text).toContain("Payment method: Online payment")
    expect(paid.text).toContain("Payment status: Paid")
    expect(paid.text).toContain("Shipping: Free")
    expect(paid.text).not.toContain("Cash on delivery")
  })

  it("treats a Shiprocket checkout COD order as cash on delivery", () => {
    const shiprocketCod = getOrderConfirmationEmail({
      customerName: "Asha",
      orderId: "ORD-1003",
      items,
      total: 450,
      ...orderSummaryFields({ paymentMethod: "shiprocket_checkout", shiprocketPaymentType: "cod" }),
    })
    expect(shiprocketCod.text).toContain("Payment method: Cash on delivery")
  })

  it("escapes customer-supplied values in the HTML", () => {
    const email = getOrderConfirmationEmail({
      customerName: `<img src=x onerror=alert(1)>`,
      orderId: "ORD-1004",
      items: [{ name: `Soap <b>"A&B"</b>`, quantity: 1, price: 10 }],
      total: 10,
    })
    expect(email.html).not.toContain("<img src=x")
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;")
    expect(email.html).toContain("Soap &lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;")
  })
})

describe("unsubscribe", () => {
  it("is offered on marketing-style mail only", () => {
    for (const name of ["welcome", "abandonedPayment"]) {
      expect(emails[name].category).toBe("marketing")
      expect(emails[name].html).toContain("unsubscribe")
      expect(emails[name].text).toContain("unsubscribe")
    }
    for (const name of ["confirmation", "statusUpdate", "cancelled", "paymentFailed", "otp"]) {
      expect(emails[name].category).toBe("transactional")
      expect(emails[name].html).not.toContain("unsubscribe")
    }
  })
})

describe("htmlToText", () => {
  it("turns the HTML-only admin notification into readable text", () => {
    const text = htmlToText(
      getAdminOrderNotificationEmail({
        customerName: "Asha Sharma",
        customerEmail: "asha@example.com",
        customerPhone: "9000000000",
        orderId: "ORD-1001",
        items,
        totalAmount: 500,
        paymentStatus: "pending",
        paymentMethod: "cod",
        shippingAddress: { ...codOrder.shippingAddress },
      }),
    )
    expect(text).not.toMatch(/<[a-z]/i)
    expect(text).not.toContain("box-sizing") // the <style> block is dropped
    expect(text).toContain("Order ID: ORD-1001")
    expect(text).toContain("asha@example.com")
    expect(text).toContain("Rose Soap")
  })

  it("keeps link targets and decodes entities", () => {
    expect(htmlToText(`<p>A &amp; B</p><p><a href="https://nezalherbocare.com/x">Open</a></p>`)).toBe(
      "A & B\nOpen (https://nezalherbocare.com/x)",
    )
  })
})
