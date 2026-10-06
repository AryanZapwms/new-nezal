// lib/mailer.ts is the only place a transport is created: these cover the
// env-driven provider switch, the headers every message gets, and the logging.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn()
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) }
})
vi.mock("nodemailer", () => ({ default: { createTransport } }))

const MAIL_ENV = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "GMAIL_EMAIL",
  "GMAIL_APP_PASSWORD",
  "EMAIL_FROM",
  "EMAIL_FROM_NAME",
  "EMAIL_REPLY_TO",
  "EMAIL_MESSAGE_ID_DOMAIN",
]

const message = { to: "customer@example.com", subject: "Your Nezal order ORD-1 is confirmed", html: "<p>Hello</p>" }

// The transport is cached at module level, so each test loads a fresh copy.
async function loadMailer(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  vi.resetModules()
  return import("@/lib/mailer")
}

let log: ReturnType<typeof vi.spyOn>
let logError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  for (const key of MAIL_ENV) vi.stubEnv(key, "")
  sendMail.mockReset()
  sendMail.mockResolvedValue({
    messageId: "<id@nezalherbocare.com>",
    accepted: ["customer@example.com"],
    rejected: [],
    response: "250 2.0.0 OK",
  })
  createTransport.mockClear()
  log = vi.spyOn(console, "log").mockImplementation(() => {})
  logError = vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("transport selection", () => {
  it("falls back to Gmail when SMTP_HOST is not set", async () => {
    const { deliverMail } = await loadMailer({ GMAIL_EMAIL: "shop@gmail.com", GMAIL_APP_PASSWORD: "app-password" })
    await deliverMail(message)

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: "shop@gmail.com", pass: "app-password" },
      }),
    )
    expect(sendMail.mock.calls[0][0].from).toEqual({ name: "Nezal Herbocare", address: "shop@gmail.com" })
  })

  it("uses the SMTP_* provider when SMTP_HOST is set, even if Gmail is also configured", async () => {
    const { deliverMail } = await loadMailer({
      SMTP_HOST: "smtp.provider.example",
      SMTP_PORT: "465",
      SMTP_USER: "apikey",
      SMTP_PASS: "smtp-secret",
      EMAIL_FROM: "orders@nezalherbocare.com",
      GMAIL_EMAIL: "shop@gmail.com",
      GMAIL_APP_PASSWORD: "app-password",
    })
    await deliverMail(message)

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.provider.example",
      port: 465,
      secure: true,
      auth: { user: "apikey", pass: "smtp-secret" },
    })
    expect(sendMail.mock.calls[0][0].from).toEqual({ name: "Nezal Herbocare", address: "orders@nezalherbocare.com" })
  })

  it("creates the transport once and reuses it", async () => {
    const { deliverMail } = await loadMailer({ GMAIL_EMAIL: "shop@gmail.com", GMAIL_APP_PASSWORD: "app-password" })
    await deliverMail(message)
    await deliverMail(message)
    expect(createTransport).toHaveBeenCalledOnce()
  })

  it("rejects, without sending, when nothing is configured", async () => {
    const { deliverMail } = await loadMailer({ EMAIL_FROM: "orders@nezalherbocare.com" })
    await expect(deliverMail(message)).rejects.toThrow(/not configured/)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("requires EMAIL_FROM with an SMTP provider instead of guessing from SMTP_USER", async () => {
    const { deliverMail } = await loadMailer({ SMTP_HOST: "smtp.provider.example", SMTP_USER: "apikey", SMTP_PASS: "x" })
    await expect(deliverMail(message)).rejects.toThrow(/EMAIL_FROM/)
    expect(sendMail).not.toHaveBeenCalled()
  })
})

describe("headers", () => {
  const gmail = { GMAIL_EMAIL: "shop@gmail.com", GMAIL_APP_PASSWORD: "app-password" }

  it("sets a named From, a Reply-To and a Message-ID on our own domain", async () => {
    const { deliverMail } = await loadMailer({ ...gmail, EMAIL_FROM: "orders@nezalherbocare.com" })
    await deliverMail(message)

    const sent = sendMail.mock.calls[0][0]
    expect(sent.from).toEqual({ name: "Nezal Herbocare", address: "orders@nezalherbocare.com" })
    expect(sent.replyTo).toBe("orders@nezalherbocare.com")
    expect(sent.messageId).toMatch(/^<[0-9a-f-]{36}@nezalherbocare\.com>$/)
  })

  it("accepts EMAIL_FROM in \"Name <address>\" form and honours the overrides", async () => {
    const { deliverMail } = await loadMailer({
      ...gmail,
      EMAIL_FROM: "Nezal Orders <orders@nezalherbocare.com>",
      EMAIL_REPLY_TO: "info@nezalherbocare.com",
      EMAIL_MESSAGE_ID_DOMAIN: "mail.nezalherbocare.com",
    })
    await deliverMail(message)

    const sent = sendMail.mock.calls[0][0]
    expect(sent.from).toEqual({ name: "Nezal Orders", address: "orders@nezalherbocare.com" })
    expect(sent.replyTo).toBe("info@nezalherbocare.com")
    expect(sent.messageId).toMatch(/@mail\.nezalherbocare\.com>$/)
  })

  it("adds List-Unsubscribe to marketing mail only", async () => {
    const { deliverMail } = await loadMailer(gmail)
    await deliverMail(message)
    await deliverMail({ ...message, category: "marketing" })

    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("list")
    expect(sendMail.mock.calls[1][0].list).toEqual({ unsubscribe: "mailto:shop@gmail.com?subject=unsubscribe" })
  })

  it("derives a plain-text part when only HTML is supplied", async () => {
    const { deliverMail } = await loadMailer(gmail)
    await deliverMail(message)
    await deliverMail({ ...message, text: "Hand-written text" })

    expect(sendMail.mock.calls[0][0].text).toBe("Hello")
    expect(sendMail.mock.calls[1][0].text).toBe("Hand-written text")
  })
})

describe("logging", () => {
  const gmail = { GMAIL_EMAIL: "shop@gmail.com", GMAIL_APP_PASSWORD: "app-password" }

  it("logs recipient, subject, accepted, rejected and the server response, never the credentials", async () => {
    const { deliverMail } = await loadMailer(gmail)
    await deliverMail(message)

    const line = log.mock.calls[0][0] as string
    expect(line).toContain("Email sent successfully to customer@example.com")
    expect(line).toContain('subject="Your Nezal order ORD-1 is confirmed"')
    expect(line).toContain('accepted=["customer@example.com"]')
    expect(line).toContain("rejected=[]")
    expect(line).toContain('response="250 2.0.0 OK"')
    expect(line).not.toContain("app-password")
  })

  it("logs the error message and rejects when the send fails", async () => {
    sendMail.mockRejectedValue(Object.assign(new Error("Invalid login: 535 Username and Password not accepted"), { code: "EAUTH" }))
    const { deliverMail } = await loadMailer(gmail)

    await expect(deliverMail(message)).rejects.toThrow(/Invalid login/)
    const line = logError.mock.calls[0][0] as string
    expect(line).toContain("Email sending failed to customer@example.com")
    expect(line).toContain("Invalid login: 535 Username and Password not accepted")
    expect(line).toContain("code=EAUTH")
    expect(log).not.toHaveBeenCalled()
  })

  it("sendEmail() reports the same failure as false instead of throwing", async () => {
    sendMail.mockRejectedValue(new Error("connect ETIMEDOUT"))
    await loadMailer(gmail)
    const { sendEmail } = await import("@/lib/email")

    await expect(sendEmail(message)).resolves.toBe(false)
    expect(logError).toHaveBeenCalledOnce()

    sendMail.mockResolvedValue({ accepted: ["customer@example.com"], rejected: [], response: "250 OK" })
    await expect(sendEmail(message)).resolves.toBe(true)
  })
})
