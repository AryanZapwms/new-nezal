// app/api/categories/route.ts
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/category";
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

    let query: any = { isActive: true };

    if (company) {
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(company)) {
    query.company = company;
  } else {
    const companyDoc = await Company.findOne({ slug: company });
    if (companyDoc) query.company = companyDoc._id;
  }
}

    if (all === "true") {
      query = {};
    }

    const categories = await Category.find(query)
      .populate("company", "name slug")
      .populate("parent", "name slug _id")
      .sort({ createdAt: -1 })
      .lean();

    if (flat) {
      return NextResponse.json(categories);
    }

    const mainCategories = categories.filter((cat: any) => !cat.parent);
    const subCategories = categories.filter((cat: any) => cat.parent);

    const hierarchical = mainCategories.map((main: any) => ({
      ...main,
      subCategories: subCategories.filter(
        (sub: any) =>
          sub.parent &&
          sub.parent._id.toString() === main._id.toString()
      ),
    }));

    return NextResponse.json(hierarchical);
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