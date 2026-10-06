// lib/email.tsx
//
// Entry point the routes import: sendEmail() plus every template. The
// templates live in lib/email-templates.ts and the transport, headers and
// logging in lib/mailer.ts.
import { deliverMail } from "@/lib/mailer"
import type { EmailCategory } from "@/lib/email-templates"

export * from "@/lib/email-templates"

/**
 * Sends an email and reports whether it went out. Never throws, so a mail
 * failure can't fail the order or payment request that triggered it; the
 * failure itself is logged by deliverMail().
 *
 * Customer templates return { subject, html, text, category }, so the usual
 * call is `sendEmail({ to, ...getOrderConfirmationEmail(...) })`.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  category,
}: {
  to: string
  subject: string
  html: string
  text?: string
  category?: EmailCategory
}) {
  try {
    await deliverMail({ to, subject, html, text, category })
    return true
  } catch {
    return false
  }
}
