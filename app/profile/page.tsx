// app/profile/page.tsx
"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, User, Phone, MapPin, Edit2, Check, X, Home, Building2, Globe } from "lucide-react"
import { useLoading } from "@/hooks/use-loading"

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
  const { withLoading } = useLoading()
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
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserProfile>(profile)

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
            const newProfile = {
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              pincode: data.pincode || "",
            }
            setProfile(newProfile)
            setEditForm(newProfile)
          }
        })
        .catch((err) => console.error("Error fetching profile:", err))
    }
  }, [status, session])

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancel = () => {
    setEditForm(profile)
    setIsEditing(false)
    setMessage("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
  await withLoading(async () => { 
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (!res.ok) throw new Error("Failed to update profile")
      
      const updatedData = await res.json()
      setProfile(updatedData)
      setEditForm(updatedData)
      setIsEditing(false)
      setMessage("✓ Profile saved successfully!")
      
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("❌ Error updating profile. Please try again.")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
      }, "Saving your profile...")  
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const displayValue = (value?: string, placeholder = "Not provided") => (
    <span className={value ? "text-gray-900" : "text-gray-400 italic"}>
      {value || placeholder}
    </span>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-500">
            {isEditing ? "Edit your personal information" : "View and manage your account details"}
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
            {/* Card header with gradient */}
            <div className="bg-gradient-to-r from-green-50 to-transparent border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit2 className="h-5 w-5 text-green-600" />
                    Edit Profile
                  </>
                ) : (
                  <>
                    <User className="h-5 w-5 text-green-600" />
                    Profile Details
                  </>
                )}
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl gap-2 border-gray-200 hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {!isEditing ? (
                  // READ-ONLY VIEW
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-6">
                      {/* Name */}
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                          <p className="text-base font-medium text-gray-900 mt-0.5">
                            {displayValue(profile.name)}
                          </p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <Mail className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Email Address</p>
                          <p className="text-base font-medium text-gray-900 mt-0.5">
                            {profile.email}
                          </p>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Phone Number</p>
                          <p className="text-base font-medium mt-0.5">
                            {displayValue(profile.phone, "Not added")}
                          </p>
                        </div>
                      </div>

                      {/* Address group */}
                      <div className="flex items-start gap-3">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <MapPin className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                          <div className="mt-1 space-y-1">
                            {profile.address ? (
                              <>
                                <p className="text-sm text-gray-700">{profile.address}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                  {profile.city && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{profile.city}</span>}
                                  {profile.state && <span>{profile.state}</span>}
                                  {profile.pincode && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{profile.pincode}</span>}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400 italic text-sm">No address saved</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // EDIT MODE
                  <motion.form
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <User className="w-4 h-4 text-green-600" />
                          Full Name
                        </label>
                        <Input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          placeholder="Your full name"
                          className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                        />
                      </div>

                      {/* Email (read-only) */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Mail className="w-4 h-4 text-green-600" />
                          Email
                        </label>
                        <Input
                          type="email"
                          name="email"
                          value={editForm.email}
                          disabled
                          className="bg-gray-50 text-gray-500 rounded-xl h-11"
                        />
                        <p className="text-xs text-gray-400">Email cannot be changed</p>
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Phone className="w-4 h-4 text-green-600" />
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          name="phone"
                          value={editForm.phone}
                          onChange={handleEditChange}
                          placeholder="Enter phone number"
                          className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Home className="w-4 h-4 text-green-600" />
                          Street Address
                        </label>
                        <Input
                          type="text"
                          name="address"
                          value={editForm.address}
                          onChange={handleEditChange}
                          placeholder="House number, street"
                          className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                        />
                      </div>

                      {/* City, State, Pincode grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">City</label>
                          <Input
                            type="text"
                            name="city"
                            value={editForm.city}
                            onChange={handleEditChange}
                            placeholder="City"
                            className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">State</label>
                          <Input
                            type="text"
                            name="state"
                            value={editForm.state}
                            onChange={handleEditChange}
                            placeholder="State"
                            className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Pincode</label>
                          <Input
                            type="text"
                            name="pincode"
                            value={editForm.pincode}
                            onChange={handleEditChange}
                            placeholder="Pincode"
                            className="border-gray-200 focus-visible:ring-green-500 rounded-xl h-11"
                          />
                        </div>
                      </div>
                    </div>

                    {message && (
                      <div
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          message.includes("✓")
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-5 gap-2"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex-1 border-gray-200 hover:bg-red-50 hover:text-red-600 rounded-xl py-5 gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}