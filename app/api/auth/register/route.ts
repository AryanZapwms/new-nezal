// app/api/auth/register/route.ts
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Otp } from "@/lib/models/otp";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { type NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/EmailOtp";
import { generateNumericOtp, hashOtp } from "@/lib/otp";

/* ─── 1. Turnstile Verification Helper ─────────────────────── */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      } ),
    });
    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error("Turnstile error:", error);
    return false;
  }
}

/* ─── 2. Simple In-Memory Rate Limiter ─────────────────────── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }

  if (entry.count >= 3) return true;

  entry.count++;
  return false;
}

/* ─── 3. Main Route ────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    // A. Rate Limiting Check
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { turnstileToken } = body;

    // B. Turnstile Security Check
    if (!turnstileToken) {
      return NextResponse.json({ error: "Security check required." }, { status: 400 });
    }

    const isValid = await verifyTurnstile(turnstileToken, ip);
    if (!isValid) {
      return NextResponse.json({ error: "Security check failed. Please refresh." }, { status: 400 });
    }

    // C. Existing Validation Logic
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = validation.data.email.trim().toLowerCase();

    const existingVerifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
    if (existingVerifiedUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    await User.deleteMany({ email: normalizedEmail, isVerified: false });
    await Otp.deleteMany({ email: normalizedEmail });

    const hashedPassword = await hashPassword(validation.data.password);

    const otpPlain = generateNumericOtp(6);
    const otpHash = hashOtp(otpPlain);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      pendingName: validation.data.name.trim(),
      pendingPassword: hashedPassword,
      pendingRole: "user",
    });

    await sendOtpEmail(normalizedEmail, validation.data.name.trim(), otpPlain);

    return NextResponse.json(
      {
        message: "OTP sent to email.",
        email: normalizedEmail,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
