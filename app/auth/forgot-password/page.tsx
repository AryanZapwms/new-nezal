// app/auth/forgot-password/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles, LifeBuoy } from "lucide-react"
import { BRAND } from "@/lib/config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      router.push("/")
    }
  }, [session, router])

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value.trim()) {
      setEmailError("Email is required")
      return false
    }
    if (!emailRegex.test(value.trim())) {
      setEmailError("Please enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")

    const isEmailValid = validateEmail(email)
    if (!isEmailValid) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong")
      }
      setMessage("OTP sent! Please check your email.")
      setTimeout(() => router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`), 1200)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[--color-bg-page]">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-4 border-[--color-brand-primary] bg-white">
                  <Image
                    src="/nezallogo.jpg"
                    alt={`${BRAND.name} Logo`}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[--color-text-heading]">{BRAND.name}</h2>
                  <p className="text-sm text-[--color-text-muted]">Nature's Care, Visible Everywhere</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-[--color-text-heading] leading-tight">
                  Recover your
                  <span className="block text-[--color-text-green] font-display italic">Access</span>
                </h1>
                <p className="text-lg text-[--color-text-body] leading-relaxed">
                  Forgot your password? We'll send a secure verification code to your email so you can reset it and get back to glowing.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Quick Recovery</h3>
                    <p className="text-sm text-[--color-text-muted]">Receive an OTP instantly to verify your identity</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Secure Process</h3>
                    <p className="text-sm text-[--color-text-muted]">Your account safety is our top priority</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <LifeBuoy className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Always Here</h3>
                    <p className="text-sm text-[--color-text-muted]">Need help? Our support team is ready to assist</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:hidden text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-4 border-[--color-brand-primary] bg-white">
                <Image
                  src="/nezallogo.jpg"
                  alt={`${BRAND.name} Logo`}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[--color-text-heading] mb-2">Forgot Password</h1>
            <p className="text-[--color-text-body]">We'll help you get back into your account</p>
          </div>

          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border border-[--color-border] shadow-xl rounded-2xl bg-white">
              <CardHeader className="space-y-2 pb-6 bg-[--color-bg-cream] rounded-t-2xl">
                <CardTitle className="text-2xl font-bold text-[--color-text-heading]">Reset your password</CardTitle>
                <CardDescription className="text-[--color-text-body] text-base">
                  Enter your email address and we'll send you a verification code
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-red-50 border-2 border-red-300">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="ml-2 text-red-800 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {message && (
                    <Alert className="bg-green-50 border-2 border-green-300">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertDescription className="ml-2 text-green-800 font-medium">
                        {message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2" htmlFor="email">
                      <Mail className="h-4 w-4 text-[--color-brand-primary]" />
                      Email Address
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (emailError) validateEmail(e.target.value)
                        }}
                        onBlur={() => validateEmail(email)}
                        disabled={isLoading}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          emailError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : email && !emailError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                      />
                      {email && !emailError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                      )}
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-[--color-brand-primary] hover:bg-[--color-brand-primary-dark] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending OTP...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Send OTP
                      </span>
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[--color-border]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[--color-text-muted] font-medium">
                      Remembered your password?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-base text-[--color-text-body]">
                    Return to{" "}
                    <Link
                      href="/auth/login"
                      className="text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-bold hover:underline transition-colors inline-flex items-center gap-1"
                    >
                      Sign in
                      <span className="text-lg">→</span>
                    </Link>
                  </p>
                </div>

                <div className="lg:hidden mt-6 pt-6 border-t border-[--color-border]">
                  <div className="flex items-center justify-center gap-2 text-xs text-[--color-text-muted]">
                    <ShieldCheck className="h-4 w-4 text-[--color-brand-primary]" />
                    <span>Secure recovery powered by {BRAND.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}