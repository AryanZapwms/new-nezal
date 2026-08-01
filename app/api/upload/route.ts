// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const ALLOWED_FOLDERS = new Set(['products', 'blogs', 'carousel', 'arrivals', 'shop-by-concern', 'uploads']);
const folder = ALLOWED_FOLDERS.has(formData.get('folder') as string)
  ? (formData.get('folder') as string)
  : 'uploads';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    const uploadedUrls: string[] = []

    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!file) continue
        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
          }
          if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
          }
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

      const result = await cloudinary.uploader.upload(base64, {
        folder: `nezal/${folder}`,
      })

      uploadedUrls.push(result.secure_url)
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    })
  } catch (error) {
    console.error("Error uploading files:", error)

    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    )
  }
}