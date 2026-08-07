// app/auth/register/page.tsx
import { Suspense } from "react"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </main>
  )
}
