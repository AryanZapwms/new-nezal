// lib/mailer.ts
//
// The one place a mail transport is created and a message is handed to it.
// Everything that sends mail (lib/email.tsx, lib/EmailOtp.ts) goes through
// deliverMail(), so headers and logging stay consistent and the provider can
// be swapped with env vars alone:
//
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   any SMTP provider
//   (SMTP_HOST unset)                            Gmail, via GMAIL_EMAIL / GMAIL_APP_PASSWORD
//   EMAIL_FROM                                   From address; a bare address or "Name <address>"
//
// Optional: EMAIL_FROM_NAME, EMAIL_REPLY_TO, EMAIL_MESSAGE_ID_DOMAIN.
//
// Imports are relative so scripts/preview-emails.js can load this file too.
import nodemailer from "nodemailer"
import { randomUUID } from "crypto"
import { BRAND } from "./config"
import { htmlToText, type EmailCategory } from "./email-templates"

const DEFAULT_FROM_NAME = "Nezal Herbocare"

export interface MailMessage {
  to: string
  subject: string
  html?: string
  /** Derived from `html` when omitted, so every message has a text/plain part. */
  text?: string
  /** "marketing" adds List-Unsubscribe. Order and account mail must stay "transactional" (the default). */
  category?: EmailCategory
}

// nodemailer ships no type declarations and @types/nodemailer isn't
// installed, so only the parts used here are described.
interface SentMailInfo {
  messageId?: string
  accepted?: unknown[]
  rejected?: unknown[]
  response?: string
}

interface MailTransport {
  sendMail(options: Record<string, unknown>): Promise<SentMailInfo>
}

let transport: MailTransport | null = null

function getTransport(): MailTransport {
  if (transport) return transport

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, GMAIL_EMAIL, GMAIL_APP_PASSWORD } = process.env

  if (SMTP_HOST) {
    const port = Number(SMTP_PORT) || 587
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465; other ports upgrade with STARTTLS
      ...(SMTP_USER && SMTP_PASS && { auth: { user: SMTP_USER, pass: SMTP_PASS } }),
    }) as MailTransport
    return transport
  }

  if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
    throw new Error(
      "Mail transport not configured: set SMTP_HOST (with SMTP_USER / SMTP_PASS) or GMAIL_EMAIL / GMAIL_APP_PASSWORD",
    )
  }

  // Gmail fallback: the same settings the two previous transports used.
  transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // must be false for port 587 (STARTTLS upgrades the connection)
    family: 4,
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  }) as MailTransport
  return transport
}

function getSender() {
  // An SMTP_USER is often not an address at all ("apikey"), so it is never used as the From.
  const configured = (process.env.EMAIL_FROM || (process.env.SMTP_HOST ? "" : process.env.GMAIL_EMAIL) || "").trim()
  const named = configured.match(/^(.*)<([^<>]+)>$/)
  const address = (named ? named[2] : configured).trim()
  if (!address.includes("@")) {
    throw new Error("Mail sender not configured: set EMAIL_FROM to the address mail should come from")
  }

  const name = process.env.EMAIL_FROM_NAME || named?.[1].replace(/"/g, "").trim() || DEFAULT_FROM_NAME
  return {
    from: { name, address },
    // The templates tell customers to reply for help, so replies must reach a monitored inbox.
    replyTo: process.env.EMAIL_REPLY_TO || address,
  }
}

/**
 * Sends one message and logs the outcome. Rejects on failure, after logging
 * it. Callers that must not fail on a mail error use sendEmail() in
 * lib/email.tsx, which turns the rejection into `false`.
 */
export async function deliverMail(message: MailMessage): Promise<SentMailInfo> {
  const { to, subject, html, category = "transactional" } = message

  try {
    const sender = getSender()
    const info = await getTransport().sendMail({
      from: sender.from,
      replyTo: sender.replyTo,
      to,
      subject,
      html,
      text: message.text ?? (html ? htmlToText(html) : undefined),
      // nodemailer would otherwise use the envelope sender's domain (gmail.com
      // today); a domain we own stays correct whichever provider relays the mail.
      messageId: `<${randomUUID()}@${process.env.EMAIL_MESSAGE_ID_DOMAIN || new URL(BRAND.domain).hostname}>`,
      ...(category === "marketing" && { list: { unsubscribe: `mailto:${sender.replyTo}?subject=unsubscribe` } }),
    })

    console.log(
      `[mail] Email sent successfully to ${to} | subject="${subject}" | accepted=${JSON.stringify(info.accepted ?? [])}` +
        ` | rejected=${JSON.stringify(info.rejected ?? [])} | response="${info.response ?? ""}" | messageId=${info.messageId ?? ""}`,
    )
    return info
  } catch (error) {
    const details = error as { message?: string; code?: string; responseCode?: number }
    console.error(
      `[mail] Email sending failed to ${to} | subject="${subject}" | error="${details?.message ?? String(error)}"` +
        ` | code=${details?.code ?? ""} | responseCode=${details?.responseCode ?? ""}`,
    )
    throw error
  }
}
