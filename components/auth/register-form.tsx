// components/auth/register-form.tsx
"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { trackCompleteRegistration } from "@/lib/facebook-pixel";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, UserRound, Verified } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import OtpForm from "./otp-form";
import { BRAND } from "@/lib/config";
import { useLoading } from "@/hooks/use-loading"
import { useSession, signIn } from "next-auth/react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState("");
  const router = useRouter();
  const { data: session } = useSession();
   const { withLoading } = useLoading()   

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (value.trim().length < 2) {
      setNameError("Please enter your full name");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(value.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmError("Please confirm your password");
      return false;
    }
    if (value !== password) {
      setConfirmError("Passwords do not match");
      return false;
    }
    setConfirmError("");
    return true;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("Please complete the Turnstile verification.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
   await withLoading(async () => { 
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword, turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      try {
        trackCompleteRegistration(email, "completed");
      } catch (_) {}

      setShowOtp(true);
      return;
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
      }, "Creating your account...")  
  }

  if (showOtp) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[--color-bg-cream]">
        <Card className="w-full max-w-lg border border-[--color-border] shadow-xl rounded-2xl">
          <CardHeader className="space-y-2 pb-6 bg-[--color-bg-cream] rounded-t-2xl">
            <CardTitle className="text-2xl font-bold text-[--color-text-heading]">Verify Your Email</CardTitle>
            <CardDescription className="text-[--color-text-body] text-base">
              Enter the verification code we sent to <span className="font-semibold text-[--color-text-heading]">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <OtpForm
              email={email}
              onSuccess={() => {
                router.push("/auth/login?registered=true&verified=true");
              }}
            />
            <div className="mt-6 text-center text-sm text-[--color-text-body]">
              Already verified?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-semibold hover:underline"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
                  Join the Nezal
                  <span className="block text-[--color-text-green] font-display italic">Glow Community</span>
                </h1>
                <p className="text-lg text-[--color-text-body] leading-relaxed">
                  Create your account to access curated natural skincare routines, exclusive offers, and personalized beauty guidance.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Curated Experiences</h3>
                    <p className="text-sm text-[--color-text-muted]">Tailored natural skincare journeys</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Secure & Private</h3>
                    <p className="text-sm text-[--color-text-muted]">Your information stays protected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[--color-brand-primary]/10 flex items-center justify-center flex-shrink-0">
                    <Verified className="w-5 h-5 text-[--color-brand-primary]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[--color-text-heading]">Quality Tested Fromulation</h3>
                    <p className="text-sm text-[--color-text-muted]">Clinically evaluated for safety efficacy and peace of mind</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:hidden text-center ">
            <div className="flex justify-centerrelative flex justify-center text-sm">
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
            <h1 className="text-3xl font-bold text-[--color-text-heading] mb-2">Create Your Account</h1>
            <p className="text-[--color-text-body]">Join {BRAND.name} and unlock natural skincare</p>
          </div>

          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border border-[--color-border] shadow-xl rounded-2xl bg-white border">
              <CardHeader className="space-y-2  bg-[--color-bg-cream] rounded-t-2xl">
                <CardTitle className="text-2xl font-bold text-[--color-text-heading]">
                  Create Account
                </CardTitle>
                <CardDescription className="text-[--color-text-body] text-base">
                  Fill in your details to start your {BRAND.name} journey
                </CardDescription>
              </CardHeader>

              <CardContent className="">


  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-[--color-border]"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-4 bg-white text-[--color-text-muted] font-medium">
        Or register with email
      </span>
    </div>
  </div>


                <form onSubmit={onSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-red-50 border-2 border-red-300">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="ml-2 text-red-800 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Name */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-[--color-brand-primary]" />
                      Full Name
                    </label>
                    <div className="relative">
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) validateName(e.target.value);
                        }}
                        onBlur={() => validateName(name)}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          nameError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : name && !nameError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isLoading}
                      />
                      {name && !nameError && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                      )}
                    </div>
                    {nameError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Email */}
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
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          emailError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : email && !emailError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isLoading}
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

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[--color-brand-primary]" />
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                          if (confirmPassword) validateConfirmPassword(confirmPassword);
                        }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          passwordError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : password && !passwordError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[--color-brand-primary] transition-colors p-1 rounded-md hover:bg-[--color-bg-cream]"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-[--color-text-heading] flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[--color-brand-primary]" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) validateConfirmPassword(e.target.value);
                        }}
                        onBlur={() => validateConfirmPassword(confirmPassword)}
                        className={`pl-4 pr-10 h-12 text-base border-2 transition-all duration-200 rounded-lg ${
                          confirmError
                            ? "border-red-400 focus:border-red-500 bg-red-50"
                            : confirmPassword && !confirmError
                            ? "border-green-400 focus:border-green-500 bg-green-50"
                            : "border-[--color-border] focus:border-[--color-brand-primary] hover:border-[--color-brand-primary]"
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[--color-brand-primary] transition-colors p-1 rounded-md hover:bg-[--color-bg-cream]"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {confirmError}
                      </p>
                    )}
                  </div>

                  {turnstileError && (
                    <Alert variant="destructive" className="bg-red-50 border-2 border-red-300">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="ml-2 text-red-800 font-medium">
                        {turnstileError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileError("Turnstile verification failed. Please try again.")}
                    onExpire={() => {
                      setTurnstileToken(null);
                      setTurnstileError("Captcha verification expired. Please try again.");
                    }}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-[#22aa2e]  text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                
  {/* NEW: Google sign-up — placed first, above the manual form */}
  <Button
    type="button"
    variant="outline"
    onClick={() => signIn("google", { callbackUrl: "/" })}
    disabled={isLoading}
    className="w-full h-12 mt-5 text-base font-semibold border border-[#c3c3c3] hover:bg-[--color-bg-cream] transition-all duration-200 rounded-lg flex items-center justify-center gap-3"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
    Continue with Google
  </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[--color-border]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[--color-text-muted] font-medium">
                      Already a member?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-base text-[--color-text-body]">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/auth/login")}
                      className="text-[--color-brand-primary] hover:text-[--color-brand-primary-dark] font-bold hover:underline transition-colors inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Sign in now
                      <span className="text-lg">→</span>
                    </button>
                  </p>
                </div>

                <div className="lg:hidden mt-6 pt-6 border-t border-[--color-border]">
                  <div className="flex items-center justify-center gap-2 text-xs text-[--color-text-muted]">
                    <ShieldCheck className="h-4 w-4 text-[--color-brand-primary]" />
                    <span>Secure registration powered by {BRAND.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}