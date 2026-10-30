// lib/fastrr-email.ts
//
// When the customer skips email, Shiprocket's checkout (Fastrr) sends
// <phone>@fastrr.com instead. Recognised here, apart from
// lib/fastrr-customers.ts, so browser code can use it too: that file loads
// the User and Order models.

export const FASTRR_PLACEHOLDER_EMAIL_REGEX = /@fastrr\.com$/i

export function isFastrrPlaceholderEmail(email: unknown): boolean {
  return typeof email === "string" && FASTRR_PLACEHOLDER_EMAIL_REGEX.test(email.trim())
}
