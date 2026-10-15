// app/api/categories/route.ts
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/category";
import { findCategories, toCategoryTree } from "@/lib/product-listing";
import { Company } from "@/lib/models/company";
import { User } from "@/lib/models/user";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const all = searchParams.get("all");
    const flat = searchParams.get("flat") === "true";

    // Shared with the server-rendered category page — see lib/product-listing.ts
    const categories = await findCategories({ company, all: all === "true" });

    if (flat) {
      return NextResponse.json(categories);
    }

    return NextResponse.json(toCategoryTree(categories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description, image, company, parent, isActive } = body;

    const category = new Category({
      name,
      slug:
        slug?.trim() ||
        name.toLowerCase().replace(/\s+/g, "-").trim(),
      description,
      image,
      company,
      parent: parent || null,
      isActive: isActive ?? true,
    });

    await category.save();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}