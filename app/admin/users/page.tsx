// app/admin/users/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Trash2, Edit2, Search, Check, X, Users, ShieldCheck, UserCheck } from "lucide-react"

interface User {
  _id: string
  name: string
  email: string
  role: "user" | "admin"
  isActive: boolean
  createdAt: string
}

export default function UsersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<"user" | "admin">("user")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const itemsPerPage = 8

  useEffect(() => {
    if (!session) { router.push("/auth/login"); return }
    fetchUsers()
  }, [session, router])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = async (userId: string, newRole: "user" | "admin") => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error("Failed to update user")
      await fetchUsers()
      setEditingId(null)
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === (session?.user as any)?.id) {
      alert("You cannot delete your own account.")
      return
    }
    if (!confirm("Are you sure you want to delete this user?")) return
    setDeletingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete user")
      await fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIdx, startIdx + itemsPerPage)

  const adminCount = users.filter((u) => u.role === "admin").length
  const activeCount = users.filter((u) => u.isActive).length

  if (loading) {
    return (
      <main style={{ fontFamily: "'DM Sans', sans-serif", background: "#fafaf9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#a8a29e", fontSize: 14 }}>Loading users…</p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: "#fafaf9", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Paytone+One&display=swap');
        .search-input { transition: border-color 0.15s ease; }
        .search-input:focus { outline: none; border-color: #d97706; }
        .user-row { transition: background 0.1s ease; }
        .user-row:hover { background: #fafaf9; }
        .icon-btn { transition: all 0.15s ease; border: 1px solid #e7e5e4; background: white; cursor: pointer; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; }
        .icon-btn:hover { border-color: #d97706; color: #d97706; }
        .icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
        .icon-btn.save { background: #1c1917; border-color: #1c1917; color: white; }
        .icon-btn.save:hover { background: #292524; }
        .role-select { border: 1px solid #e7e5e4; border-radius: 6px; padding: 4px 8px; font-size: 12px; background: white; color: #1c1917; font-family: 'DM Sans', sans-serif; }
        .role-select:focus { outline: none; border-color: #d97706; }
        .page-btn { border: 1px solid #e7e5e4; background: white; border-radius: 7px; padding: 6px 14px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #44403c; transition: all 0.15s ease; }
        .page-btn:hover:not(:disabled) { border-color: #d97706; color: #d97706; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Paytone', serif", fontSize: 36, fontWeight: 400, color: "#1c1917", margin: 0, lineHeight: 1.1 }}>
            User Management
          </h1>
          <p style={{ color: "#78716c", fontSize: 14, marginTop: 6 }}>
            View, edit roles, and remove users from the platform.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { icon: <Users size={15} />, label: "Total Users", value: users.length },
            { icon: <ShieldCheck size={15} />, label: "Admins", value: adminCount },
            { icon: <UserCheck size={15} />, label: "Active", value: activeCount },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#a8a29e", marginBottom: 8 }}>
                {s.icon}
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, fontWeight: 400, color: "#1c1917", margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          {/* Table header bar */}
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f5f5f4", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#1c1917", margin: 0 }}>
              {filteredUsers.length} {searchQuery ? "matching" : "total"} users
            </p>
            <div style={{ position: "relative", width: 280 }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#a8a29e" }} />
              <input
                type="text"
                placeholder="Search by name, email or role…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="search-input"
                style={{
                  width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  border: "1px solid #e7e5e4", borderRadius: 8, fontSize: 12, color: "#1c1917",
                  background: "#fafaf9", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f5f5f4" }}>
                  {["Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "#a8a29e", fontSize: 13 }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user._id} className="user-row" style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: "#fef3c7",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 600, color: "#d97706", flexShrink: 0,
                          }}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1c1917" }}>{user.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: 12, color: "#78716c" }}>{user.email}</span>
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        {editingId === user._id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                            className="role-select"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", padding: "3px 10px",
                            borderRadius: 99, fontSize: 11, fontWeight: 500,
                            background: user.role === "admin" ? "#fef3c7" : "#f5f5f4",
                            color: user.role === "admin" ? "#d97706" : "#78716c",
                          }}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{ fontSize: 12, color: "#a8a29e" }}>
                          {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {editingId === user._id ? (
                            <>
                              <button className="icon-btn save" title="Save" onClick={() => handleEditRole(user._id, editRole)}>
                                <Check size={13} />
                              </button>
                              <button className="icon-btn" title="Cancel" onClick={() => setEditingId(null)}>
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="icon-btn"
                                title="Edit role"
                                onClick={() => { setEditingId(user._id); setEditRole(user.role) }}
                              >
                                <Edit2 size={13} />
                              </button>
                              {user._id !== (session?.user as any)?.id && (
                                <button
                                  className="icon-btn danger"
                                  title="Delete user"
                                  onClick={() => handleDeleteUser(user._id)}
                                  disabled={deletingId === user._id}
                                  style={{ opacity: deletingId === user._id ? 0.5 : 1 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f5f5f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>
                Showing {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  Previous
                </button>
                <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}