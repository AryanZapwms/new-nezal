// app/admin/categories/page.tsx
"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FolderTree, Trash2, Edit2, Plus, X, RefreshCw, CornerDownRight, Building2,
} from "lucide-react"

/* ─── Types ──────────────────────────────────────────────── */

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  company: { _id: string; name: string }
  parent?: { _id: string; name: string; slug: string }
  isActive: boolean
}

interface Company {
  _id: string
  name: string
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  company: "",
  parent: "",
  isActive: true,
}

const selectClass =
  "w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"

/* ─── Page ───────────────────────────────────────────────── */

export default function CategoriesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }
    fetchData()
  }, [session, router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [categoriesRes, companiesRes] = await Promise.all([
        fetch("/api/categories?all=true&flat=true"),
        fetch("/api/companies"),
      ])

      const categoriesData = await categoriesRes.json()
      const companiesData = await companiesRes.json()

      if (categoriesRes.ok && Array.isArray(categoriesData)) {
        setCategories(categoriesData)
      } else {
        console.error("Failed to fetch categories:", categoriesData)
        setCategories([])
      }

      if (companiesRes.ok && Array.isArray(companiesData)) {
        setCompanies(companiesData)
      } else {
        console.error("Failed to fetch companies:", companiesData)
        setCompanies([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setCategories([])
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to save category")

      await fetchData()
      handleCancel()
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      company: category.company._id,
      parent: category.parent?._id || "",
      isActive: category.isActive,
    })
    setEditingId(category._id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Delete this category? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      await fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
  }

  // Order categories so children sit directly under their parent, for a readable hierarchy in the table.
  const orderedCategories = useMemo(() => {
    const topLevel = categories.filter((c) => !c.parent)
    const ordered: Category[] = []
    topLevel.forEach((parent) => {
      ordered.push(parent)
      categories
        .filter((c) => c.parent?._id === parent._id)
        .forEach((child) => ordered.push(child))
    })
    // Any orphaned children whose parent isn't in the list (e.g. different company) still get shown.
    categories.forEach((c) => {
      if (c.parent && !ordered.includes(c)) ordered.push(c)
    })
    return ordered
  }, [categories])

  const activeCount = categories.filter((c) => c.isActive).length
  const topLevelCount = categories.filter((c) => !c.parent).length
  const subCount = categories.length - topLevelCount

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading categories...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500 mt-0.5">Organize products into categories and sub-categories.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              className="border-gray-200 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Add category
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total categories", value: categories.length, color: "text-gray-900", dot: "bg-gray-400" },
            { label: "Active", value: activeCount, color: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Top-level", value: topLevelCount, color: "text-blue-700", dot: "bg-blue-500" },
            { label: "Sub-categories", value: subCount, color: "text-amber-700", dot: "bg-amber-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Form card ────────────────────────────────────── */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                  {editingId ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                </div>
                <h2 className="font-semibold text-gray-900">
                  {editingId ? "Edit category" : "Add a new category"}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-gray-500 hover:text-gray-900">
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                    Category Name *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Skincare"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                    Slug <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="Auto-generated if empty"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Placement
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Company *</label>
                    <select
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      required
                      className={selectClass}
                    >
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Parent category</label>
                    <select
                      name="parent"
                      value={formData.parent}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">None (top-level category)</option>
                      {categories
                        .filter((c) => c.company._id === formData.company && !c.parent && c._id !== editingId)
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Description <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="A short description of this category"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 accent-emerald-700"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-800">Active</label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">
                  {editingId ? "Update category" : "Create category"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="font-semibold text-gray-900">All categories</h2>
            <span className="text-xs text-gray-400">{categories.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-3">Slug</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FolderTree className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No categories yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first category to get started.</p>
                    </td>
                  </tr>
                ) : (
                  orderedCategories.map((category) => (
                    <tr key={category._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">

                      {/* Name (+ description, indented if sub-category) */}
                      <td className="py-3.5 px-6">
                        <div className={category.parent ? "flex items-start gap-1.5 pl-5" : "flex items-start gap-1.5"}>
                          {category.parent && <CornerDownRight className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{category.name}</p>
                            {category.parent && (
                              <p className="text-[11px] text-gray-400">Sub-category of {category.parent.name}</p>
                            )}
                            {category.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5 max-w-xs">{category.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {category.slug}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-3 text-sm text-gray-600">{category.company.name}</td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${category.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6">
                        <div className="flex gap-1.5 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(category)} className="text-gray-400 hover:text-emerald-700" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(category._id)} className="text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}