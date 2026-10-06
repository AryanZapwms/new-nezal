// lib/email-templates.ts
//
// Every email body the app sends. The customer-facing templates return
// { subject, html, text, category }; the HTML and the plain-text part are
// rendered from one list of blocks, so the two can't drift apart.
//
// They are deliberately plain, because the previous versions were landing in
// Gmail's Spam folder: table layout with inline CSS only (no <style>, scripts
// or web fonts), a single image, links to nezalherbocare.com only, no emoji,
// and every customer-supplied value HTML-escaped.
//
// Imports are relative (not "@/...") and free of side effects so that
// scripts/preview-emails.js can load this file on its own.
import { BRAND } from "./config"

export type EmailCategory = "transactional" | "marketing"

export interface EmailContent {
  subject: string
  html: string
  text: string
  /** "marketing" mail carries an unsubscribe line here and a List-Unsubscribe header in lib/mailer.ts. */
  category: EmailCategory
}

export interface OrderEmailItem {
  name: string
  quantity: number
  price: number
  selectedSize?: {
    size?: string | null
    unit?: string | null
    quantity?: number | null
    price?: number | null
    discountPrice?: number | null
  } | null
}

export interface OrderEmailAddress {
  name?: string | null
  phone?: string | null
  street?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  pincode?: string | null
  country?: string | null
}

export interface OrderSummaryFields {
  shippingAmount?: number | null
  codCharge?: number | null
  discountAmount?: number | null
  couponCode?: string | null
  paymentMethod?: string | null
  shiprocketPaymentType?: string | null
  shippingAddress?: OrderEmailAddress | null
}

/** Picks the summary fields the order emails show off a stored Order (document or lean object). */
export function orderSummaryFields(order: any): OrderSummaryFields {
  return {
    shippingAmount: order?.shippingAmount,
    codCharge: order?.codCharge,
    discountAmount: order?.discountAmount,
    couponCode: order?.couponCode,
    paymentMethod: order?.paymentMethod,
    shiprocketPaymentType: order?.shiprocketPaymentType,
    shippingAddress: order?.shippingAddress,
  }
}

// ── Shared pieces ──────────────────────────────────────────────────────────

const SITE_URL = BRAND.domain
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "")
const ORDERS_URL = `${SITE_URL}/profile/orders`
const SUPPORT_PHONE = BRAND.phone.replace(/^\+91/, "+91 ")
const LOGO = { src: `${SITE_URL}/nezallogo.png`, width: 96, height: 71, alt: "Nezal Herbocare" }

// From app/shipping-policy/page.tsx — keep the two in step.
const STANDARD_DELIVERY_NOTE =
  "Orders are usually dispatched within 1 to 2 business days. Delivery then takes 2 to 6 business days for most locations, and up to 10 for remote areas."

const FONT = "font-family:Arial,Helvetica,sans-serif;"
const BODY_TEXT = `${FONT}font-size:15px;line-height:22px;color:#222222;`
const SMALL_TEXT = `${FONT}font-size:13px;line-height:19px;color:#666666;`

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function money(amount: unknown): string {
  return `₹${(Number(amount) || 0).toFixed(2)}`
}

function greeting(name?: string | null): string {
  const trimmed = (name || "").trim()
  return trimmed ? `Hello ${trimmed},` : "Hello,"
}

function sizeLabel(size: OrderEmailItem["selectedSize"]): string {
  if (!size?.size) return ""
  return size.quantity && size.unit ? `${size.size} (${size.quantity} ${size.unit})` : size.size
}

function addressLines(address?: OrderEmailAddress | null): string[] {
  if (!address) return []
  const cityAndState = [address.city, address.state].filter(Boolean).join(", ")
  return [
    address.name,
    address.street || address.address,
    [cityAndState, address.zipCode || address.pincode].filter(Boolean).join(" "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : "",
  ].filter(Boolean) as string[]
}

function isCashOnDelivery({ paymentMethod, shiprocketPaymentType }: OrderSummaryFields): boolean {
  return paymentMethod === "cod" || (paymentMethod === "shiprocket_checkout" && shiprocketPaymentType === "cod")
}

// ── Layout ─────────────────────────────────────────────────────────────────

type Row = [label: string, value: string]

type Block =
  | { type: "text"; text: string }
  | { type: "lines"; lines: string[] }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "rows"; rows: Row[] }
  | { type: "items"; items: OrderEmailItem[]; totals: Row[]; total: Row }
  | { type: "code"; code: string }
  | { type: "link"; label: string; href: string }

function blockToHtml(block: Block): string {
  switch (block.type) {
    case "text":
      return `<p style="margin:0 0 16px 0;">${esc(block.text)}</p>`
    case "lines":
      return `<p style="margin:0 0 16px 0;">${block.lines.map((line) => esc(line)).join("<br>")}</p>`
    case "heading":
      return `<h2 style="margin:24px 0 8px 0;${FONT}font-size:16px;line-height:22px;font-weight:bold;color:#222222;">${esc(block.text)}</h2>`
    case "list":
      return `<ul style="margin:0 0 16px 0;padding:0 0 0 20px;">${block.items
        .map((item) => `<li style="margin:0 0 4px 0;">${esc(item)}</li>`)
        .join("")}</ul>`
    case "rows":
      return [
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">`,
        ...block.rows.map(
          ([label, value]) =>
            `<tr><td width="40%" valign="top" style="padding:3px 12px 3px 0;${SMALL_TEXT}">${esc(label)}</td>` +
            `<td valign="top" style="padding:3px 0;${BODY_TEXT}">${esc(value)}</td></tr>`,
        ),
        `</table>`,
      ].join("\n")
    case "items": {
      const head = `padding:8px 0;border-bottom:1px solid #dddddd;${SMALL_TEXT}font-weight:normal;`
      const cell = `padding:8px 0;border-bottom:1px solid #eeeeee;${BODY_TEXT}`
      return [
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;border-collapse:collapse;">`,
        `<tr><th align="left" style="${head}">Item</th><th align="center" width="48" style="${head}">Qty</th><th align="right" width="96" style="${head}">Amount</th></tr>`,
        ...block.items.map((item) => {
          const size = sizeLabel(item.selectedSize)
          return (
            `<tr><td align="left" valign="top" style="${cell}">${esc(item.name)}` +
            (size ? `<br><span style="${SMALL_TEXT}">Size: ${esc(size)}</span>` : "") +
            `</td><td align="center" valign="top" style="${cell}">${esc(item.quantity)}</td>` +
            `<td align="right" valign="top" style="${cell}">${esc(money(item.price * item.quantity))}</td></tr>`
          )
        }),
        ...block.totals.map(
          ([label, value]) =>
            `<tr><td colspan="2" align="right" style="padding:6px 12px 0 0;${SMALL_TEXT}">${esc(label)}</td>` +
            `<td align="right" style="padding:6px 0 0 0;${BODY_TEXT}">${esc(value)}</td></tr>`,
        ),
        `<tr><td colspan="2" align="right" style="padding:8px 12px 0 0;${BODY_TEXT}font-weight:bold;">${esc(block.total[0])}</td>` +
          `<td align="right" style="padding:8px 0 0 0;${BODY_TEXT}font-weight:bold;">${esc(block.total[1])}</td></tr>`,
        `</table>`,
      ].join("\n")
    }
    case "code":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr>` +
        `<td style="padding:12px 20px;border:1px solid #dddddd;font-family:'Courier New',Courier,monospace;font-size:28px;line-height:34px;letter-spacing:4px;color:#222222;">${esc(block.code)}</td>` +
        `</tr></table>`
      )
    case "link":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr>` +
        `<td bgcolor="#2e6b34" style="background-color:#2e6b34;border-radius:4px;">` +
        `<a href="${esc(block.href)}" style="display:inline-block;padding:10px 18px;${FONT}font-size:15px;line-height:20px;color:#ffffff;text-decoration:none;">${esc(block.label)}</a>` +
        `</td></tr></table>`
      )
  }
}

function blockToText(block: Block): string {
  switch (block.type) {
    case "text":
      return block.text
    case "lines":
      return block.lines.join("\n")
    case "heading":
      return `${block.text}\n${"-".repeat(block.text.length)}`
    case "list":
      return block.items.map((item) => `- ${item}`).join("\n")
    case "rows":
      return block.rows.map(([label, value]) => `${label}: ${value}`).join("\n")
    case "items":
      return [
        ...block.items.map((item) => {
          const size = sizeLabel(item.selectedSize)
          return `- ${item.name}${size ? `, ${size}` : ""} x ${item.quantity}: ${money(item.price * item.quantity)}`
        }),
        "",
        ...[...block.totals, block.total].map(([label, value]) => `${label}: ${value}`),
      ].join("\n")
    case "code":
      return block.code
    case "link":
      return `${block.label}: ${block.href}`
  }
}

function renderEmail({
  subject,
  title,
  blocks,
  unsubscribeReason,
}: {
  subject: string
  title: string
  blocks: Block[]
  /** Set only on marketing-style mail: completes "You are receiving this email because …". */
  unsubscribeReason?: string
}): EmailContent {
  const helpLines = ["Reply to this email for help.", `Email: ${BRAND.supportEmail}`, `Phone: ${SUPPORT_PHONE}`]
  const unsubscribeLine = unsubscribeReason
    ? `You are receiving this email because ${unsubscribeReason}. To stop receiving emails like this one, reply with "unsubscribe" in the subject line.`
    : ""

  const html = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `<title>${esc(subject)}</title>`,
    `</head>`,
    `<body style="margin:0;padding:0;background-color:#f5f5f5;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">`,
    `<tr><td align="center" style="padding:24px 12px;">`,
    // width="600" is for Outlook, which ignores max-width; everywhere else the table is fluid up to 600px.
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dddddd;">`,
    `<tr><td align="left" style="padding:24px 24px 0 24px;">`,
    `<img src="${LOGO.src}" width="${LOGO.width}" height="${LOGO.height}" alt="${LOGO.alt}" style="display:block;border:0;">`,
    `</td></tr>`,
    `<tr><td align="left" style="padding:16px 24px 8px 24px;${BODY_TEXT}">`,
    `<h1 style="margin:0 0 16px 0;${FONT}font-size:20px;line-height:26px;font-weight:bold;color:#222222;">${esc(title)}</h1>`,
    ...blocks.map(blockToHtml),
    `</td></tr>`,
    `<tr><td align="left" style="padding:16px 24px 24px 24px;border-top:1px solid #dddddd;${SMALL_TEXT}">`,
    `<p style="margin:0 0 8px 0;">${helpLines.map((line) => esc(line)).join("<br>")}</p>`,
    `<p style="margin:0 0 8px 0;">${esc(BRAND.legalName)}<br>${esc(BRAND.registeredAddress)}</p>`,
    unsubscribeLine ? `<p style="margin:0 0 8px 0;">${esc(unsubscribeLine)}</p>` : "",
    `<p style="margin:0;"><a href="${SITE_URL}" style="color:#666666;">${SITE_HOST}</a></p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ]
    .filter(Boolean)
    .join("\n")

  const text = [
    title,
    ...blocks.map(blockToText),
    "--",
    helpLines.join("\n"),
    `${BRAND.legalName}\n${BRAND.registeredAddress}`,
    unsubscribeLine,
    SITE_URL,
  ]
    .filter(Boolean)
    .join("\n\n")

  return { subject, html, text, category: unsubscribeReason ? "marketing" : "transactional" }
}

/**
 * Plain-text rendering of an HTML email, for messages that only supply HTML
 * (the admin notification below). lib/mailer.ts uses it so that no message
 * goes out without a text/plain part.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(head|style|script)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ") // line breaks in the source carry no meaning; only the tags below do
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, label: string) =>
      /^(https?:|mailto:)/i.test(href) ? `${label} (${href})` : label,
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<\/(td|th|span)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&copy;/g, "(c)")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.replace(/ +/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ── Customer-facing templates ──────────────────────────────────────────────

export function getOrderConfirmationEmail({
  customerName,
  orderId,
  items,
  total,
  orderDate,
  paymentStatus = "pending",
  expectedDelivery,
  ...summary
}: {
  customerName: string
  orderId: string
  items: OrderEmailItem[]
  total: number
  orderDate?: string
  paymentStatus?: string
  /** Replaces the standard dispatch/delivery note when a real estimate is known. */
  expectedDelivery?: string
} & OrderSummaryFields): EmailContent {
  const lineItems = items || []
  const cashOnDelivery = isCashOnDelivery(summary)
  const discount = Number(summary.discountAmount) || 0
  const codCharge = Number(summary.codCharge) || 0

  const totals: Row[] = [["Subtotal", money(lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0))]]
  if (discount > 0) {
    totals.push([summary.couponCode ? `Discount (${summary.couponCode})` : "Discount", `-${money(discount)}`])
  }
  if (summary.shippingAmount != null) {
    totals.push(["Shipping", summary.shippingAmount > 0 ? money(summary.shippingAmount) : "Free"])
  }
  if (codCharge > 0) totals.push(["Cash on delivery charge", money(codCharge)])

  const details: Row[] = [
    ["Order number", orderId],
    ["Order date", orderDate || new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })],
  ]
  if (cashOnDelivery) details.push(["Payment method", "Cash on delivery"])
  else if (summary.paymentMethod) details.push(["Payment method", "Online payment"])
  details.push([
    "Payment status",
    paymentStatus === "completed" ? "Paid" : cashOnDelivery ? `${money(total)} payable on delivery` : "Payment pending",
  ])

  const shipTo = addressLines(summary.shippingAddress)

  return renderEmail({
    subject: `Your Nezal order ${orderId} is confirmed`,
    title: "Your order is confirmed",
    blocks: [
      { type: "text", text: greeting(customerName) },
      { type: "text", text: "Thank you for your order. We have received it and are preparing it for dispatch." },
      { type: "rows", rows: details },
      { type: "heading", text: "Order summary" },
      { type: "items", items: lineItems, totals, total: ["Total", money(total)] },
      ...(shipTo.length > 0
        ? ([
            { type: "heading", text: "Shipping address" },
            { type: "lines", lines: shipTo },
          ] as Block[])
        : []),
      { type: "heading", text: "Expected delivery" },
      { type: "text", text: expectedDelivery || STANDARD_DELIVERY_NOTE },
      { type: "text", text: `To check the status of your order, sign in at ${SITE_HOST} with this email address.` },
      { type: "link", label: "View your orders", href: ORDERS_URL },
    ],
  })
}

const ORDER_STATUS_COPY: Record<string, { label: string; subject: string; message: string }> = {
  pending: { label: "Pending", subject: "is pending", message: "Your order is pending and will be processed soon." },
  processing: {
    label: "Processing",
    subject: "is being prepared",
    message: "Your order is being packed and will be dispatched soon.",
  },
  shipped: { label: "Shipped", subject: "has shipped", message: "Your order has been shipped and is on its way to you." },
  delivered: {
    label: "Delivered",
    subject: "has been delivered",
    message: "Your order has been delivered. Thank you for shopping with Nezal.",
  },
  cancelled: { label: "Cancelled", subject: "has been cancelled", message: "Your order has been cancelled." },
}

export function getOrderStatusUpdateEmail({
  customerName,
  orderId,
  orderStatus,
  items,
  paymentStatus,
  totalAmount,
  ...summary
}: {
  customerName: string
  orderId: string
  orderStatus: string
  items: OrderEmailItem[]
  paymentStatus: string
  totalAmount: number
} & OrderSummaryFields): EmailContent {
  const copy = ORDER_STATUS_COPY[orderStatus]

  const details: Row[] = [
    ["Order number", orderId],
    ["Status", copy?.label || orderStatus],
  ]
  // A cancelled order has nothing left to pay; refunds are covered by the cancellation email.
  if (orderStatus !== "cancelled") {
    details.push([
      "Payment",
      paymentStatus === "completed"
        ? "Paid"
        : isCashOnDelivery(summary)
          ? `${money(totalAmount)} payable on delivery`
          : "Pending",
    ])
  }

  return renderEmail({
    subject: copy ? `Your Nezal order ${orderId} ${copy.subject}` : `Update on your Nezal order ${orderId}`,
    title: "Order update",
    blocks: [
      { type: "text", text: greeting(customerName) },
      { type: "text", text: copy?.message || "The status of your order has been updated." },
      { type: "rows", rows: details },
      { type: "heading", text: "Order summary" },
      { type: "items", items: items || [], totals: [], total: ["Total", money(totalAmount)] },
      { type: "link", label: "View your orders", href: ORDERS_URL },
    ],
  })
}

export function getOrderCancelledEmail({
  customerName,
  orderNumber,
  totalAmount,
  reason,
  refundInitiated,
}: {
  customerName: string
  orderNumber: string
  totalAmount: number
  reason?: string
  refundInitiated: boolean
}): EmailContent {
  const details: Row[] = [["Order number", orderNumber]]
  if (reason) details.push(["Reason", reason])

  return renderEmail({
    subject: `Your Nezal order ${orderNumber} has been cancelled`,
    title: "Your order has been cancelled",
    blocks: [
      { type: "text", text: greeting(customerName) },
      { type: "text", text: "Your order has been cancelled." },
      { type: "rows", rows: details },
      {
        type: "text",
        text: refundInitiated
          ? `A refund of ${money(totalAmount)} has been initiated to your original payment method. It usually takes 5 to 7 business days to appear, depending on your bank.`
          : "No payment was collected for this order, so no refund is due.",
      },
      { type: "link", label: "View your orders", href: ORDERS_URL },
    ],
  })
}

export function getPaymentFailedEmail({
  customerName,
  orderId,
  totalAmount,
  reason,
}: {
  customerName: string
  orderId?: string
  totalAmount: number
  reason?: string
}): EmailContent {
  const details: Row[] = []
  if (orderId) details.push(["Order number", orderId])
  details.push(["Amount", money(totalAmount)])
  if (reason) details.push(["Reason", reason])

  return renderEmail({
    subject: orderId ? `Payment not completed for your Nezal order ${orderId}` : "Your Nezal payment was not completed",
    title: "Payment not completed",
    blocks: [
      { type: "text", text: greeting(customerName) },
      {
        type: "text",
        text: `Your recent payment at Nezal could not be completed${orderId ? ` for order ${orderId}` : ""}. You have not been charged. If any amount was deducted, it will be refunded automatically within 5 to 7 business days.`,
      },
      { type: "rows", rows: details },
      { type: "text", text: "The items are still in your cart, so you can try again whenever you are ready." },
      { type: "link", label: "Return to checkout", href: `${SITE_URL}/checkout` },
      {
        type: "text",
        text: "If the problem continues, or a deducted amount is not refunded within 7 days, reply to this email and we will look into it.",
      },
    ],
  })
}

export function getAbandonedPaymentEmail({
  customerName,
  orderId,
  totalAmount,
  supportPhone,
}: {
  customerName: string
  orderId?: string
  totalAmount: number
  /** Defaults to the brand support number. */
  supportPhone?: string
}): EmailContent {
  const details: Row[] = []
  if (orderId) details.push(["Order number", orderId])
  details.push(["Amount", money(totalAmount)])

  return renderEmail({
    subject: orderId ? `Your Nezal order ${orderId} is awaiting payment` : "Your Nezal order is awaiting payment",
    title: "Your order is awaiting payment",
    blocks: [
      { type: "text", text: greeting(customerName) },
      {
        type: "text",
        text: "Your recent order at Nezal was not completed because the payment step did not go through. No charge was made, and the order has not been confirmed.",
      },
      { type: "rows", rows: details },
      { type: "link", label: "Return to checkout", href: `${SITE_URL}/checkout` },
      {
        type: "text",
        text: `If you need help completing the payment, call us at ${supportPhone || SUPPORT_PHONE} or reply to this email.`,
      },
      { type: "text", text: "If you have decided not to go ahead with this order, no action is needed and you will not be charged." },
    ],
    unsubscribeReason: `you started an order at ${SITE_HOST}`,
  })
}

export function getWelcomeEmail(name: string): EmailContent {
  return renderEmail({
    subject: "Welcome to Nezal",
    title: "Welcome to Nezal",
    blocks: [
      { type: "text", text: greeting(name) },
      {
        type: "text",
        text: "Thank you for creating an account with Nezal. Your email address has been verified and your account is ready to use.",
      },
      { type: "text", text: "From your account you can:" },
      { type: "list", items: ["See your orders and their current status", "Keep a wishlist of products"] },
      { type: "link", label: "Go to your account", href: `${SITE_URL}/profile` },
    ],
    unsubscribeReason: `you created an account at ${SITE_HOST}`,
  })
}

export function getOtpEmail(name: string, otp: string): EmailContent {
  return renderEmail({
    subject: "Your Nezal verification code",
    title: "Your verification code",
    blocks: [
      { type: "text", text: greeting(name) },
      { type: "text", text: `Enter this code on ${SITE_HOST} to continue:` },
      { type: "code", code: otp },
      { type: "text", text: "This code expires in 10 minutes." },
      {
        type: "text",
        text: "If you did not request this code, you can ignore this email. Do not share the code with anyone.",
      },
    ],
  })
}

// ── Admin notification ─────────────────────────────────────────────────────
// Internal mail to the store's own inbox; moved here unchanged from
// lib/email.tsx. Returns HTML only — lib/mailer.ts derives the text part.

export function getAdminOrderNotificationEmail({
  customerName,
  customerEmail,
  customerPhone,
  orderId,
  items,
  totalAmount,
  paymentStatus,
  paymentMethod,
  shippingAddress,
  orderDate,
}: {
  customerName: string
  customerEmail: string
  customerPhone: string
  orderId: string
  items: Array<{
    name: string
    quantity: number
    price: number
    selectedSize?: {
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }
  }>
  totalAmount: number
  paymentStatus: string
  paymentMethod: string
  shippingAddress: {
    name: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  orderDate?: string
}) {
  const itemsHtml = (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">
          <div style="color: #2c3e50; font-weight: 500;">${item.name}</div>
          ${
            item.selectedSize
              ? `<div style="color: #7f8c8d; font-size: 13px; margin-top: 5px;">
                  Size: ${item.selectedSize.size} (${item.selectedSize.quantity}${item.selectedSize.unit})
                </div>`
              : ""
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center; color: #34495e;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; color: #8B4513; font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  const itemsSubtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0)

  const paymentStatusColor = paymentStatus === 'completed' ? '#27ae60' : '#f39c12'
  const paymentStatusText = paymentStatus === 'completed' ? '✓ PAID' : '⏱ PENDING - COD'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background-color: #f8f9fa;
          }
          .email-wrapper {
            background-color: #f8f9fa;
            padding: 20px;
          }
          .container { 
            max-width: 700px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .alert-header {
            background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
            border-bottom: 4px solid #a93226;
          }
          .alert-header h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .alert-header p {
            font-size: 14px;
            opacity: 0.95;
            margin-top: 5px;
          }
          .content { 
            padding: 30px;
          }
          .section-title {
            background: #f5e6d3;
            color: #8B4513;
            padding: 12px 15px;
            border-left: 4px solid #8B4513;
            font-weight: 700;
            font-size: 14px;
            margin-top: 20px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-title:first-child {
            margin-top: 0;
          }
          .info-block {
            background: #faf7f2;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e8dcc8;
            font-size: 14px;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #8B4513;
            min-width: 120px;
          }
          .info-value {
            color: #34495e;
            font-weight: 500;
            text-align: right;
            flex: 1;
            padding-left: 10px;
          }
          .payment-badge {
            display: inline-block;
            background: ${paymentStatusColor};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
          }
          .items-table thead tr {
            background: #f5e6d3;
            border-bottom: 2px solid #8B4513;
          }
          .items-table thead th {
            padding: 12px;
            text-align: left;
            color: #8B4513;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
          }
          .items-table tbody td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
          }
          .items-table tbody tr:last-child td {
            border-bottom: none;
          }
          .total-section {
            background: #f5e6d3;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            padding: 8px 0;
            border-bottom: 1px solid #e8dcc8;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-row.grand-total {
            border-top: 2px solid #8B4513;
            padding-top: 12px;
            margin-top: 8px;
            font-size: 16px;
            font-weight: 700;
            color: #8B4513;
          }
          .address-box {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
          }
          .address-box p {
            font-size: 13px;
            color: #34495e;
            margin: 5px 0;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #ecf0f1;
            font-size: 11px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Alert Header -->
            <div class="alert-header">
              <h1>🚨 NEW ORDER RECEIVED</h1>
              <p>Order ID: ${orderId} | ${orderDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Customer Information -->
              <div class="section-title">👤 Customer Information</div>
              <div class="info-block">
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value"><strong>${customerEmail}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value"><strong>${customerPhone}</strong></span>
                </div>
              </div>

              <!-- Shipping Address -->
              <div class="section-title">📦 Shipping Address</div>
              <div class="address-box">
                <p><strong>${shippingAddress.name}</strong></p>
                <p>${shippingAddress.street}</p>
                <p>${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}</p>
                <p>${shippingAddress.country}</p>
                <p style="margin-top: 8px; border-top: 1px solid #b3d9e8; padding-top: 8px;">📱 ${shippingAddress.phone}</p>
              </div>

              <!-- Order Items -->
              <div class="section-title">📋 Order Items</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th style="text-align: center; width: 80px;">Qty</th>
                    <th style="text-align: right; width: 100px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Price Summary -->
              <div class="total-section">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>₹${itemsSubtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Shipping:</span>
                  <span>Free</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <!-- Payment Details -->
              <div class="section-title">💳 Payment Details</div>
              <div class="info-block">
                <div class="info-row">
                  <span class="info-label">Payment Method:</span>
                  <span class="info-value" style="text-transform: uppercase; font-weight: 600;">${paymentMethod}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Status:</span>
                  <span class="info-value"><span class="payment-badge">${paymentStatusText}</span></span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>Nezal Order Management System</strong></p>
              <p>This is an automated admin notification. Please process this order accordingly.</p>
              <p style="margin-top: 10px; border-top: 1px solid #ecf0f1; padding-top: 10px;">
                &copy; 2025 nezalherbocare.com. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
