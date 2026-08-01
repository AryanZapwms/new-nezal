"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Trash2, RefreshCw, FolderOpen, AlertTriangle, CheckSquare, XSquare,
  Cloud, HardDrive, ImageIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* ─── Types ──────────────────────────────────────────────── */

interface ImageFile {
  path: string
  folder: string
  filename: string
  size: number
  isUsed: boolean
  usedBy: string[]
  storageType: "local" | "cloudinary"
}

const FOLDER_COLORS: Record<string, string> = {
  arrivals: "bg-blue-50 text-blue-700",
  blogs: "bg-emerald-50 text-emerald-700",
  carousel: "bg-purple-50 text-purple-700",
  "shop-by-concern": "bg-amber-50 text-amber-700",
  uploads: "bg-gray-100 text-gray-600",
}

export default function ImagesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string>("all")

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    if (!session) return
    scanImages()
  }, [status, session, router])

  const scanImages = async () => {
    setScanning(true)
    setSelectedImages(new Set())
    try {
      const res = await fetch("/api/admin/images/scan")
      if (!res.ok) throw new Error("Failed to scan images")
      const data = await res.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("Error scanning images:", error)
      toast({ title: "Error", description: "Failed to scan images", variant: "destructive" })
    } finally {
      setScanning(false)
      setLoading(false)
    }
  }

  const deleteImage = async (imagePath: string) => {
    setDeleting(imagePath)
    try {
      const res = await fetch("/api/admin/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: imagePath }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete image")
      }
      toast({ title: "Success", description: "Image deleted successfully" })
      setImages(prev => prev.filter(img => img.path !== imagePath))
      setSelectedImages(prev => { const s = new Set(prev); s.delete(imagePath); return s })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete image", variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  const bulkDeleteImages = async () => {
    setBulkDeleting(true)
    let successCount = 0
    let failCount = 0
    for (const imagePath of Array.from(selectedImages)) {
      try {
        const res = await fetch("/api/admin/images/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: imagePath }),
        })
        if (res.ok) {
          successCount++
          setImages(prev => prev.filter(img => img.path !== imagePath))
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }
    setBulkDeleting(false)
    setSelectedImages(new Set())
    setShowDeleteDialog(false)
    toast({
      title: successCount > 0 ? "Success" : "Error",
      description: `Deleted ${successCount} image(s).${failCount > 0 ? ` Failed: ${failCount}.` : ""}`,
      variant: successCount > 0 ? "default" : "destructive",
    })
  }

  const toggleImageSelection = (imagePath: string) => {
    setSelectedImages(prev => {
      const s = new Set(prev)
      s.has(imagePath) ? s.delete(imagePath) : s.add(imagePath)
      return s
    })
  }

  const selectAllInFolder = (folder: string, used: boolean) => {
    const folderImages = getFilteredImages(folder, used)
    const allPaths = folderImages.map(img => img.path)
    const allSelected = allPaths.every(p => selectedImages.has(p))
    setSelectedImages(prev => {
      const s = new Set(prev)
      allSelected ? allPaths.forEach(p => s.delete(p)) : allPaths.forEach(p => s.add(p))
      return s
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFolderColor = (folder: string) => FOLDER_COLORS[normaliseFolder(folder)] || "bg-gray-100 text-gray-600"

  const getFolderLabel = (folder: string) =>
    folder.replace("cloudinary/", "").replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())

  // Normalise folder for tab grouping: "cloudinary/arrivals" → "arrivals"
  const normaliseFolder = (folder: string) => folder.replace("cloudinary/", "")

  const folders = Array.from(new Set(images.map(img => normaliseFolder(img.folder)))).sort()

  const getFilteredImages = (folder: string, used: boolean) =>
    images.filter(img =>
      (folder === "all" || normaliseFolder(img.folder) === folder) &&
      img.isUsed === used
    )

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading images...
        </div>
      </main>
    )
  }

  const usedImages = images.filter(img => img.isUsed)
  const unusedImages = images.filter(img => !img.isUsed)
  const cloudinaryCount = images.filter(img => img.storageType === "cloudinary").length
  const localCount = images.filter(img => img.storageType === "local").length
  const selectedUnusedCount = Array.from(selectedImages).filter(p => unusedImages.some(img => img.path === p)).length

  const usedInFolder = getFilteredImages(activeFolder, true)
  const unusedInFolder = getFilteredImages(activeFolder, false)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Image Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage images across local storage and Cloudinary.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedImages.size > 0 && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={bulkDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {bulkDeleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete selected ({selectedImages.size})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={scanImages}
              disabled={scanning}
              className="border-gray-200 text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Scan images"}
            </Button>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <p className="text-xs font-medium text-gray-500">Total images</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-gray-900">{images.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-gray-500">Used</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">{usedImages.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="text-xs font-medium text-gray-500">Unused</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-700">{unusedImages.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <p className="text-xs font-medium text-gray-500">Storage</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm">
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-gray-900 tabular-nums">{cloudinaryCount}</span>
                <span className="text-gray-400 text-xs">Cloudinary</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-900 tabular-nums">{localCount}</span>
                <span className="text-gray-400 text-xs">Local</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Folder filter ────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["all", ...folders].map((folder) => {
            const active = activeFolder === folder
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {folder === "all" ? "All folders" : getFolderLabel(folder)}
              </button>
            )
          })}
        </div>

        {/* ── Used images ──────────────────────────────────── */}
        {usedInFolder.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="font-semibold text-gray-900">Used images</h2>
              <span className="text-xs text-gray-400">{usedInFolder.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {usedInFolder.map(image => (
                <ImageCard
                  key={image.path}
                  image={image}
                  formatFileSize={formatFileSize}
                  getFolderColor={getFolderColor}
                  getFolderLabel={getFolderLabel}
                  normaliseFolder={normaliseFolder}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Unused images ────────────────────────────────── */}
        {unusedInFolder.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Unused images</h2>
                <span className="text-xs text-gray-400">{unusedInFolder.length}</span>
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Local only · safe to delete
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllInFolder(activeFolder, false)}
                className="border-gray-200 text-gray-600 hover:text-gray-900"
              >
                {unusedInFolder.every(img => selectedImages.has(img.path))
                  ? <><XSquare className="w-3.5 h-3.5 mr-1.5" /> Deselect all</>
                  : <><CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Select all</>}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {unusedInFolder.map(image => (
                <div
                  key={image.path}
                  className={`relative bg-white border rounded-2xl overflow-hidden transition-all ${
                    selectedImages.has(image.path) ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-200"
                  }`}
                >
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <Checkbox
                      checked={selectedImages.has(image.path)}
                      onCheckedChange={() => toggleImageSelection(image.path)}
                      className="bg-white border-2 border-gray-300"
                    />
                  </div>
                  <div className="aspect-square relative bg-gray-100">
                    <img
                      src={image.path}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg" }}
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${getFolderColor(image.folder)}`}>
                        {getFolderLabel(normaliseFolder(image.folder))}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unused
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <HardDrive className="w-3 h-3" /> Local
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>{image.filename}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => deleteImage(image.path)}
                      disabled={deleting === image.path}
                    >
                      {deleting === image.path
                        ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting...</>
                        : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {usedInFolder.length === 0 && unusedInFolder.length === 0 && (
          <div className="text-center bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No images found</p>
            <p className="text-xs text-gray-400 mt-1">No images in this folder.</p>
          </div>
        )}
      </div>

      {/* ── Bulk delete dialog ───────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl sm:max-w-[440px]">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600" />
            </div>
            <AlertDialogTitle>Delete {selectedImages.size} image{selectedImages.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Selected images will be permanently deleted.
              {selectedUnusedCount < selectedImages.size && (
                <span className="block mt-2 text-amber-700 font-medium">
                  Warning: {selectedImages.size - selectedUnusedCount} selected image(s) are marked as "used".
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDeleteImages}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkDeleting ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

/* ─── Sub-component: used image card ────────────────────────── */

function ImageCard({
  image,
  formatFileSize,
  getFolderColor,
  getFolderLabel,
  normaliseFolder,
}: {
  image: ImageFile
  formatFileSize: (b: number) => string
  getFolderColor: (f: string) => string
  getFolderLabel: (f: string) => string
  normaliseFolder: (f: string) => string
}) {
  const normalised = normaliseFolder(image.folder)
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="aspect-square relative bg-gray-100">
        <img
          src={image.path}
          alt={image.filename}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg" }}
        />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${getFolderColor(image.folder)}`}>
            {getFolderLabel(normalised)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Used
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {image.storageType === "cloudinary"
            ? <><Cloud className="w-3 h-3 text-blue-500" /><span>Cloudinary</span></>
            : <><HardDrive className="w-3 h-3" /><span>Local</span></>}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>{image.filename}</p>
        <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
        {image.usedBy.length > 0 && (
          <p className="text-xs text-gray-400 truncate" title={image.usedBy.join(", ")}>
            {image.usedBy[0]}{image.usedBy.length > 1 ? ` +${image.usedBy.length - 1} more` : ""}
          </p>
        )}
      </div>
    </div>
  )
}