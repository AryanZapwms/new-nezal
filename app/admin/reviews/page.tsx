// app/admin/reviews/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Star, ArrowLeft, MessageSquare, TrendingUp, Users } from "lucide-react"

interface CompanySummary {
  companyId: string
  name: string
  slug: string
  logo?: string
  totalReviews: number
  averageRating: number
}

interface AdminReview {
  id: string
  rating: number
  comment: string
  userName: string
  userEmail: string
  createdAt: string
  product?: {
    id: string
    name: string
    image?: string
    slug?: string
  } | null
  reply: {
    message: string
    repliedAt: string
    repliedBy: string
    repliedByName: string
  } | null
}

interface ReviewSummary {
  total: number
  averageRating: number
  ratingCounts: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

const defaultSummary: ReviewSummary = {
  total: 0,
  averageRating: 0,
  ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
}

function parseSummary(summary: any): ReviewSummary {
  if (!summary) return { ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } }
  return {
    total: typeof summary.total === "number" ? summary.total : 0,
    averageRating: typeof summary.averageRating === "number" ? summary.averageRating : 0,
    ratingCounts: {
      1: summary.ratingCounts?.[1] ?? 0,
      2: summary.ratingCounts?.[2] ?? 0,
      3: summary.ratingCounts?.[3] ?? 0,
      4: summary.ratingCounts?.[4] ?? 0,
      5: summary.ratingCounts?.[5] ?? 0,
    },
  }
}

function parseReview(review: any): AdminReview {
  const resolveId = (value: any) => {
    if (typeof value === "string") return value
    if (value?._id) return value._id.toString()
    if (typeof value?.toString === "function") return value.toString()
    return ""
  }
  const product = review?.product
    ? {
        id: resolveId(review.product.id ?? review.product._id),
        name: typeof review.product.name === "string" ? review.product.name : "",
        image: typeof review.product.image === "string" ? review.product.image : undefined,
        slug: typeof review.product.slug === "string" ? review.product.slug : undefined,
      }
    : null
  const reply = review?.reply
    ? {
        message: typeof review.reply.message === "string" ? review.reply.message : "",
        repliedAt:
          typeof review.reply.repliedAt === "string"
            ? review.reply.repliedAt
            : review.reply.repliedAt instanceof Date
            ? review.reply.repliedAt.toISOString()
            : "",
        repliedBy: resolveId(review.reply.repliedBy),
        repliedByName: typeof review.reply.repliedByName === "string" ? review.reply.repliedByName : "",
      }
    : null
  return {
    id: resolveId(review?.id ?? review?._id),
    rating: Number(review?.rating) || 0,
    comment: typeof review?.comment === "string" ? review.comment : "",
    userName: typeof review?.userName === "string" ? review.userName : "",
    userEmail: typeof review?.userEmail === "string" ? review.userEmail : "",
    createdAt:
      typeof review?.createdAt === "string"
        ? review.createdAt
        : review?.createdAt instanceof Date
        ? review.createdAt.toISOString()
        : "",
    product,
    reply: reply && reply.message ? reply : null,
  }
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${rating >= s ? "fill-amber-400 stroke-amber-400" : "stroke-stone-300 fill-none"}`}
        />
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const { toast } = useToast()
  const { status } = useSession()
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(null)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [summary, setSummary] = useState<ReviewSummary>(defaultSummary)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    const fetchCompanies = async () => {
      setLoadingCompanies(true)
      try {
        const res = await fetch("/api/admin/reviews")
        if (!res.ok) throw new Error("Failed to load companies")
        const data = await res.json()
        const list: CompanySummary[] = Array.isArray(data.companies) ? data.companies : []
        setCompanies(list)
        if (list.length > 0) {
          setSelectedCompanyId(list[0].companyId)
          setSelectedCompany(list[0])
        }
      } catch {
        toast({ title: "Failed to load companies", description: "Please try again later.", variant: "destructive" })
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [toast, status])

  useEffect(() => {
    if (!selectedCompanyId) {
      setReviews([])
      setSummary({ ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } })
      return
    }
    const company = companies.find((item) => item.companyId === selectedCompanyId) || null
    setSelectedCompany(company)
    const fetchReviews = async () => {
      setReviewsLoading(true)
      try {
        const res = await fetch(`/api/admin/reviews?companyId=${selectedCompanyId}`)
        if (!res.ok) throw new Error("Failed to load reviews")
        const data = await res.json()
        const parsed = Array.isArray(data.reviews) ? data.reviews.map(parseReview) : []
        setReviews(parsed)
        setSummary(parseSummary(data.summary))
        const replies: Record<string, string> = {}
        for (const review of parsed) replies[review.id] = review.reply?.message || ""
        setReplyMessages(replies)
      } catch {
        toast({ title: "Failed to load reviews", description: "Please try again later.", variant: "destructive" })
        setReviews([])
        setSummary({ ...defaultSummary, ratingCounts: { ...defaultSummary.ratingCounts } })
        setReplyMessages({})
      } finally {
        setReviewsLoading(false)
      }
    }
    fetchReviews()
  }, [companies, selectedCompanyId, toast])

  const handleReplySubmit = async (reviewId: string) => {
    const message = replyMessages[reviewId]?.trim()
    if (!message) {
      toast({ title: "Reply required", description: "Please enter a reply message.", variant: "destructive" })
      return
    }
    setReplySubmitting(reviewId)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to send reply" }))
        throw new Error(error.error || "Failed to send reply")
      }
      const data = await res.json()
      if (data.review) {
        const parsed = parseReview(data.review)
        setReviews((prev) => prev.map((item) => (item.id === reviewId ? parsed : item)))
        setReplyMessages((prev) => ({ ...prev, [reviewId]: parsed.reply?.message || "" }))
        toast({ title: "Reply sent", description: "Your response has been posted." })
      }
    } catch (error) {
      toast({
        title: "Failed to send reply",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setReplySubmitting(null)
    }
  }

  const ratingPercentage = useMemo(() => {
    if (!summary.total) return (_: number) => 0
    return (rating: number) => Math.round(((summary.ratingCounts as any)[rating] / summary.total) * 100)
  }, [summary])

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: "#fafaf9", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');
        .company-btn { transition: all 0.15s ease; }
        .company-btn:hover { background: #f5f5f4; }
        .company-btn.active { background: #fefce8; border-color: #d97706; }
        .reply-box { transition: border-color 0.15s ease; }
        .reply-box:focus { outline: none; border-color: #d97706; }
        .send-btn { transition: all 0.15s ease; background: #1c1917; color: white; }
        .send-btn:hover { background: #292524; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-card { transition: transform 0.15s ease; }
        .stat-card:hover { transform: translateY(-1px); }
        .rating-bar { background: #e7e5e4; border-radius: 99px; height: 4px; overflow: hidden; }
        .rating-bar-fill { background: #d97706; height: 100%; border-radius: 99px; transition: width 0.4s ease; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#78716c", fontSize: 13, textDecoration: "none", marginBottom: 20 }}>
            <ArrowLeft size={14} />
            Back to Admin
          </Link>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, fontWeight: 400, color: "#1c1917", margin: 0, lineHeight: 1.1 }}>
            Product Reviews
          </h1>
          <p style={{ color: "#78716c", fontSize: 14, marginTop: 6 }}>
            Manage customer feedback and respond on behalf of each company.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32 }}>
          {/* Sidebar */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Companies
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {loadingCompanies ? (
                <p style={{ fontSize: 13, color: "#a8a29e", padding: "12px 0" }}>Loading...</p>
              ) : companies.length === 0 ? (
                <p style={{ fontSize: 13, color: "#a8a29e", padding: "12px 0" }}>No reviews yet.</p>
              ) : (
                companies.map((company) => (
                  <button
                    key={company.companyId}
                    onClick={() => setSelectedCompanyId(company.companyId)}
                    className={`company-btn ${company.companyId === selectedCompanyId ? "active" : ""}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      border: `1px solid ${company.companyId === selectedCompanyId ? "#d97706" : "#e7e5e4"}`,
                      borderRadius: 10, cursor: "pointer", background: "transparent", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#f5f5f4", flexShrink: 0, position: "relative" }}>
                      {company.logo ? (
                        <Image src={company.logo} alt={company.name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#a8a29e" }}>
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: 13, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {company.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>{company.totalReviews} reviews</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Star size={11} className="fill-amber-400 stroke-amber-400" />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#78716c" }}>{company.averageRating.toFixed(1)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main content */}
          <div>
            {selectedCompany ? (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                  {[
                    { icon: <MessageSquare size={16} />, label: "Total Reviews", value: summary.total },
                    { icon: <Star size={16} />, label: "Average Rating", value: summary.averageRating.toFixed(1) },
                    { icon: <TrendingUp size={16} />, label: "5-Star Share", value: `${ratingPercentage(5)}%` },
                  ].map((stat, i) => (
                    <div key={i} className="stat-card" style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: "20px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#a8a29e", marginBottom: 10 }}>
                        {stat.icon}
                        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{stat.label}</span>
                      </div>
                      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: "#1c1917", margin: 0 }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Rating breakdown */}
                <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                    Rating Breakdown
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <div key={r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#78716c", width: 8 }}>{r}</span>
                        <Star size={11} className="fill-amber-400 stroke-amber-400" />
                        <div className="rating-bar" style={{ flex: 1 }}>
                          <div className="rating-bar-fill" style={{ width: `${ratingPercentage(r)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#a8a29e", width: 28, textAlign: "right" }}>{ratingPercentage(r)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews list */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
                    Reviews ({reviews.length})
                  </p>

                  {reviewsLoading ? (
                    <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: 40, textAlign: "center", color: "#a8a29e", fontSize: 13 }}>
                      Loading reviews...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: 40, textAlign: "center", color: "#a8a29e", fontSize: 13 }}>
                      No reviews for this company yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {reviews.map((review) => (
                        <div key={review.id} style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: 24 }}>
                          {/* Review header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <p style={{ fontWeight: 500, fontSize: 14, color: "#1c1917", margin: 0 }}>{review.userName || "Anonymous"}</p>
                              <p style={{ fontSize: 12, color: "#a8a29e", margin: "2px 0 6px" }}>{review.userEmail}</p>
                              <StarRow rating={review.rating} />
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontSize: 11, color: "#c0bbb7", margin: 0 }}>
                                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                              {review.product && selectedCompany?.slug && (
                                <Link
                                  href={`/shop/${selectedCompany.slug}/product/${review.product.id}`}
                                  style={{ fontSize: 11, color: "#d97706", textDecoration: "none", display: "block", marginTop: 4 }}
                                >
                                  {review.product.name} →
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Comment */}
                          <p style={{ fontSize: 14, color: "#44403c", lineHeight: 1.6, margin: "0 0 16px" }}>{review.comment}</p>

                          {/* Existing reply */}
                          {review.reply && (
                            <div style={{ background: "#fafaf9", border: "1px solid #e7e5e4", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: "#78716c", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Your reply
                              </p>
                              <p style={{ fontSize: 13, color: "#44403c", margin: 0, lineHeight: 1.5 }}>{review.reply.message}</p>
                              <p style={{ fontSize: 11, color: "#c0bbb7", margin: "6px 0 0" }}>
                                {new Date(review.reply.repliedAt).toLocaleDateString()} · {review.reply.repliedByName}
                              </p>
                            </div>
                          )}

                          {/* Reply box */}
                          <div>
                            <textarea
                              value={replyMessages[review.id] ?? ""}
                              onChange={(e) => setReplyMessages((prev) => ({ ...prev, [review.id]: e.target.value }))}
                              placeholder="Write a reply…"
                              rows={2}
                              className="reply-box"
                              style={{
                                width: "100%", padding: "10px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
                                fontSize: 13, color: "#1c1917", background: "#fafaf9", resize: "vertical",
                                fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                              }}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                              <button
                                onClick={() => handleReplySubmit(review.id)}
                                disabled={replySubmitting === review.id}
                                className="send-btn"
                                style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                              >
                                {replySubmitting === review.id ? "Sending…" : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: 60, textAlign: "center", color: "#a8a29e", fontSize: 14 }}>
                Select a company to view its reviews.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}