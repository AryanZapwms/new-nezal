// app/profile/page.tsx
"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, User, Phone, MapPin } from "lucide-react"
import { BRAND } from "@/lib/config"

interface UserProfile {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setProfile((prev) => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }))
      
      fetch("/api/users/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setProfile((prev) => ({
              ...prev,
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              pincode: data.pincode || "",
            }))
          }
        })
        .catch((err) => console.error("Error fetching profile:", err))
    }
  }, [status, session])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      if (!res.ok) throw new Error("Failed to update profile")
      
      const updatedData = await res.json()
      setProfile(updatedData)
      setMessage("✓ Profile saved successfully! Your changes have been stored.")
      
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("❌ Error updating profile. Please try again.")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[--color-bg-page] flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg">Loading profile...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <main className="min-h-screen bg-[--color-bg-page]">
      <div className="container-nezal py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[--color-text-heading] mb-2">Profile Settings</h1>
          <p className="text-[--color-text-body]">Update your personal information and contact details</p>
        </div>

        <Card className="border border-[--color-border] rounded-2xl shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-[--color-text-heading]">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-[--color-text-heading]">
                  <User className="w-4 h-4 text-[--color-brand-primary]" />
                  Full Name
                </label>
                <Input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                />
              </div>

              {/* Email (disabled) */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-[--color-text-heading]">
                  <Mail className="w-4 h-4 text-[--color-brand-primary]" />
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="bg-[--color-bg-cream] text-[--color-text-muted] rounded-lg h-10"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-[--color-text-heading]">
                  <Phone className="w-4 h-4 text-[--color-brand-primary]" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-[--color-text-heading]">
                  <MapPin className="w-4 h-4 text-[--color-brand-primary]" />
                  Address
                </label>
                <Input
                  type="text"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                />
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[--color-text-heading]">City</label>
                  <Input
                    type="text"
                    name="city"
                    value={profile.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[--color-text-heading]">State</label>
                  <Input
                    type="text"
                    name="state"
                    value={profile.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[--color-text-heading]">Pincode</label>
                  <Input
                    type="text"
                    name="pincode"
                    value={profile.pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                    className="border-[--color-border] focus-visible:ring-[--color-brand-primary] rounded-lg h-10"
                  />
                </div>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-4 rounded-lg text-sm font-medium transition-all ${
                    message.includes("✓")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#258112] hover:bg-[--color-brand-primary-dark] text-white font-semibold py-5 rounded-xl"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}