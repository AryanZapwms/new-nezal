// Review-import placeholder accounts (lib/imported-users.ts) must not count as
// customers, can't be registered over, and can't be deleted while they still
// own reviews. Covers both the isImported flag and the @imported.nezal
// email-domain fallback used before nezal-seed/mark-imported-users.js runs.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import mongoose from "mongoose"
import { NextRequest } from "next/server"
import { User } from "@/lib/models/user"
import { Review } from "@/lib/models/review"
import { Product } from "@/lib/models/product"
import { Otp } from "@/lib/models/otp"
import { connectTestDb, disconnectTestDb } from "./setup-db"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }))
vi.mock("@/lib/EmailOtp", () => ({ sendOtpEmail: vi.fn().mockResolvedValue(undefined) }))
import { getServerSession } from "next-auth"
import { sendOtpEmail } from "@/lib/EmailOtp"

let registerPOST: typeof import("@/app/api/auth/register/route").POST
let usersGET: typeof import("@/app/api/users/route").GET
let userDELETE: typeof import("@/app/api/users/[id]/route").DELETE
let analyticsGET: typeof import("@/app/api/admin/analytics/route").GET

beforeAll(async () => {
  await connectTestDb()
  ;({ POST: registerPOST } = await import("@/app/api/auth/register/route"))
  ;({ GET: usersGET } = await import("@/app/api/users/route"))
  ;({ DELETE: userDELETE } = await import("@/app/api/users/[id]/route"))
  ;({ GET: analyticsGET } = await import("@/app/api/admin/analytics/route"))
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Review.deleteMany({}), Product.deleteMany({}), Otp.deleteMany({})])
  vi.mocked(getServerSession).mockReset()
  vi.mocked(sendOtpEmail).mockClear()
  // Cloudflare Turnstile always passes in tests.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }))
})

const ADMIN = { email: "admin@nezal.com", name: "Admin", role: "admin" }

async function seedUsers() {
  const admin = await User.create(ADMIN)
  const real = await User.create({ email: "priya@example.com", name: "Priya", role: "user" })
  // Flagged placeholder, and one only recognisable by domain (pre-backfill).
  const flagged = await User.create({ email: "ananya.1a2b3c4d@imported.nezal", name: "Ananya", isImported: true, isVerified: false })
  const unflagged = await User.create({ email: "rohit@imported.nezal", name: "Rohit", isVerified: true })
  return { admin, real, flagged, unflagged }
}

function asAdmin(admin: { _id: any }) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: String(admin._id), email: ADMIN.email, name: "Admin", role: "admin" },
  } as any)
}

let ipCounter = 0
function registerRequest(email: string) {
  // Unique IP per request so the route's in-memory rate limiter never kicks in.
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "x-forwarded-for": `10.0.0.${++ipCounter}` },
    body: JSON.stringify({ name: "Someone", email, password: "secret123", confirmPassword: "secret123", turnstileToken: "ok" }),
  })
}

describe("POST /api/auth/register — imported accounts", () => {
  it("rejects @imported.nezal emails with a generic error and leaves the account intact", async () => {
    const { flagged } = await seedUsers()

    const res = await registerPOST(registerRequest(flagged.email))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Unable to register with this email address.")
    expect(body.error).not.toMatch(/imported/i)

    expect(await User.findById(flagged._id)).not.toBeNull()
    expect(sendOtpEmail).not.toHaveBeenCalled()
    expect(await Otp.countDocuments({})).toBe(0)
  })

  it("rejects the domain case-insensitively", async () => {
    const res = await registerPOST(registerRequest("Someone@IMPORTED.NEZAL"))
    expect(res.status).toBe(400)
  })

  it("never deletes an isImported account, even under a different email domain", async () => {
    // e.g. an admin later edits a placeholder's email — the flag still protects it.
    const renamed = await User.create({ email: "renamed@example.com", name: "Renamed", isImported: true, isVerified: false })

    const res = await registerPOST(registerRequest("renamed@example.com"))
    expect(res.status).toBe(201)
    expect(await User.findById(renamed._id)).not.toBeNull()
  })

  it("still clears abandoned unverified sign-ups for normal emails", async () => {
    await User.create({ email: "new@example.com", name: "Abandoned", isVerified: false })

    const res = await registerPOST(registerRequest("new@example.com"))
    expect(res.status).toBe(201)
    expect(await User.countDocuments({ email: "new@example.com" })).toBe(0)
    expect(sendOtpEmail).toHaveBeenCalledOnce()
  })
})

describe("GET /api/users — imported accounts hidden", () => {
  it("excludes imported users (flag or domain) by default and reports their count", async () => {
    const { admin } = await seedUsers()
    asAdmin(admin)

    const res = await usersGET(new Request("http://localhost/api/users"))
    expect(res.status).toBe(200)
    const emails = (await res.json()).map((u: any) => u.email).sort()
    expect(emails).toEqual(["admin@nezal.com", "priya@example.com"])
    expect(res.headers.get("X-Imported-User-Count")).toBe("2")
  })

  it("includes them with ?includeImported=true", async () => {
    const { admin } = await seedUsers()
    asAdmin(admin)

    const res = await usersGET(new Request("http://localhost/api/users?includeImported=true"))
    expect(await res.json()).toHaveLength(4)
  })

  it("still requires admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "x", role: "user" } } as any)
    const res = await usersGET(new Request("http://localhost/api/users"))
    expect(res.status).toBe(403)
  })
})

describe("GET /api/admin/analytics — totalUsers", () => {
  it("counts only real customers", async () => {
    const { admin } = await seedUsers()
    asAdmin(admin)

    const res = await analyticsGET(new NextRequest("http://localhost/api/admin/analytics"))
    expect(res.status).toBe(200)
    const body = await res.json()
    // priya only: the admin isn't role "user", and both placeholders are excluded.
    expect(body.overview.totalUsers).toBe(1)
  })
})

describe("DELETE /api/users/[id] — imported accounts", () => {
  async function addReview(userId: any) {
    const product = await Product.create({
      name: "Rose Soap",
      slug: `rose-soap-${new mongoose.Types.ObjectId()}`,
      price: 100,
      company: new mongoose.Types.ObjectId(),
      sku: "SKU-RS",
    })
    await Review.create({
      product: product._id,
      company: product.company,
      user: userId,
      rating: 5,
      comment: "Lovely",
      userName: "Ananya",
      userEmail: "ananya@example.com",
      status: "approved",
    })
  }

  const del = (id: any) => userDELETE(new Request(`http://localhost/api/users/${id}`), { params: Promise.resolve({ id: String(id) }) })

  it("blocks deleting an imported user that still has reviews", async () => {
    const { admin, flagged, unflagged } = await seedUsers()
    await addReview(flagged._id)
    await addReview(unflagged._id)
    asAdmin(admin)

    for (const u of [flagged, unflagged]) {
      const res = await del(u._id)
      expect(res.status).toBe(409)
      expect((await res.json()).error).toMatch(/imported reviewer account with 1 review/)
      expect(await User.findById(u._id)).not.toBeNull()
    }
  })

  it("allows deleting an imported user once it has no reviews", async () => {
    const { admin, flagged } = await seedUsers()
    asAdmin(admin)

    const res = await del(flagged._id)
    expect(res.status).toBe(200)
    expect(await User.findById(flagged._id)).toBeNull()
  })

  it("does not change deletion of regular users", async () => {
    const { admin, real } = await seedUsers()
    await addReview(real._id)
    asAdmin(admin)

    const res = await del(real._id)
    expect(res.status).toBe(200)
  })
})
