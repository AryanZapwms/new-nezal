// app/auth/verify-otp/page.tsx
"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, KeyRound } from "lucide-react"

function VerifyOtpContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const trimmedOtp = otp.trim()
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: trimmedOtp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid OTP")
      setSuccess("OTP verified successfully")
      setTimeout(() => router.push(`/auth/reset-password?email=${email}&otp=${otp}`), 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[--color-bg-page]">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 bg-white border border-[--color-border] rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <KeyRound className="mx-auto h-12 w-12 text-[--color-brand-primary]" />
          <h1 className="text-2xl font-bold text-[--color-text-heading] mt-4">Verify OTP</h1>
          <p className="text-sm text-[--color-text-muted] mt-2">We sent a code to {email}</p>
        </div>
        <Input
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          className="h-12 text-center tracking-widest text-xl border-2 border-[--color-border] rounded-lg focus:border-[--color-brand-primary]"
        />
        {error && (
          <p className="text-red-600 flex items-center gap-1 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
        {success && (
          <p className="text-green-600 flex items-center gap-1 text-sm">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </p>
        )}
        <Button
          type="submit"
          className="w-full h-12 bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-semibold rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
          ) : (
            <ShieldCheck className="mr-2 h-5 w-5" />
          )} Verify
        </Button>
      </form>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[--color-brand-primary]" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  )
}