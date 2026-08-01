// components/auth/login-form.tsx
"use client"

import React, { useState, useEffect } from "react"

import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { BRAND } from "@/lib/config"
import { useLoading } from "@/hooks/use-loading"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const isSubmitting = isLoading || isRedirecting
  
  const { withLoading } = useLoading()

const router = useRouter()
const { data: session, update } = useSession()
const searchParams = useSearchParams()
const redirectTo = searchParams.get("redirect") ?? "/"  // ← add this

useEffect(() => {
  if (session?.user) {
    setIsRedirecting(true)
    if (session.user.role === "admin") {
      router.push("/admin")
    } else {
      router.push(redirectTo)  // ← was router.push("/"), now uses redirect param
    }
  }
}, [session, router, redirectTo])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError("Email is required")
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required")
      return false
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return false
    }
    setPasswordError("")
    return true
  }

async function onSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError("")

  const isEmailValid = validateEmail(email)
  const isPasswordValid = validatePassword(password)

  if (!isEmailValid || !isPasswordValid) return

  setIsLoading(true)

  await withLoading(async () => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.")
        } else {
          setError(result.error)
        }
        return
      }

      if (result?.ok) {
        setIsRedirecting(true)
        await update()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, "Signing you in...")
}

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[--color-bg-page]">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">

          {/* Left Side - Welcome Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 px-8">
            <div className="space-y-6">
              {/* Logo */}
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

              {/* Welcome Text */}
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-[--color-text-heading] leading-tight">
                  Welcome Back to
                  <span className="block text-[--color-text-green] font-display italic">Nezal</span>
                </h1>
                <p className="text-lg text-[--color-text-body] leading-relaxed">
                  Your journey to radiant skin continues here. Sign in to access exclusive natural skincare products.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Natural Products</h3>
                    <p className="text-sm text-[--color-text-muted]">100% natural extracts, cruelty‑free</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Secure & Safe</h3>
                    <p className="text-sm text-[--color-text-muted]">Your data protected with encryption</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Expert Guidance</h3>
                    <p className="text-sm text-[--color-text-muted]">Personalized skincare recommendations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Logo */}
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
            <h1 className="text-3xl font-bold text-[--color-text-heading] mb-2">Welcome Back</h1>
            <p className="text-[--color-text-body]">Sign in to your {BRAND.name} account</p>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border border-[--color-border] shadow-xl rounded-2xl bg-white">
              <CardHeader className="space-y-2 pb-6 bg-[--color-bg-cream] rounded-t-2xl">
                <CardTitle className="text-2xl font-bold text-[--color-text-heading]">
                  Sign In
                </CardTitle>
                <CardDescription className="text-[--color-text-body] text-base">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={onSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-red-50 border-2 border-red-300">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="ml-2 text-red-800 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2">
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
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          emailError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : email && !emailError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isSubmitting}
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

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[--color-brand-primary]" />
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (passwordError) validatePassword(e.target.value)
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          passwordError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : password && !passwordError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[--color-brand-primary] transition-colors p-1 rounded-md hover:bg-[--color-bg-cream]"
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Forgot Password */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => router.push("/auth/forgot-password")}
                      className="text-sm text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-semibold hover:underline transition-all"
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-[#31b753] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isRedirecting ? "Redirecting..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>


            {/* NEW: Google sign-in */}


<Button
  type="button"
  variant="outline"
  onClick={() => signIn("google", { callbackUrl: redirectTo })}
  disabled={isSubmitting}
  className="w-full h-12 text-base font-semibold mt-5 border border-[#c3c3c3] hover:bg-[--color-bg-cream] transition-all duration-200 rounded-lg flex items-center justify-center gap-3"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
  Continue with Google
</Button>



                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[--color-border]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[--color-text-muted] font-medium">
                      New to {BRAND.name}?
                    </span>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <p className="text-base text-[--color-text-body]">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/register")}
                      className="text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-bold hover:underline transition-colors inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Create one now
                      <span className="text-lg">→</span>
                    </button>
                  </p>
                </div>

                {/* Mobile security note */}
                <div className="lg:hidden mt-6 pt-6 border-t border-[--color-border]">
                  <div className="flex items-center justify-center gap-2 text-xs text-[--color-text-muted]">
                    <ShieldCheck className="h-4 w-4 text-[--color-brand-primary]" />
                    <span>Protected by industry-standard encryption</span>
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