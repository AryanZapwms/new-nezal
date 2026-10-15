import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { Product } from "@/lib/models/product";
import { getShopByConcern } from "@/lib/home-sections";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

type ParamType = { params: Promise<{ id: string }> };

type ShopByConcernPayload = {
  title?: string;
  image?: string;
  description?: string;
  productId?: string;
  isActive?: boolean;
};

export async function GET(request: Request, { params }: ParamType) {
  try {
    await connectDB();

    const { id } = await params;
    const url = new URL(request.url);
    const showAll = url.searchParams.get("all") === "true";

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Shared with the home page's server render — see lib/home-sections.ts
    return NextResponse.json(await getShopByConcern(company, { showAll }));
  } catch (error) {
    console.error("Error fetching shop by concern items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch shop by concern",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: ParamType) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body: ShopByConcernPayload = await request.json();
    const { title, image, description, productId, isActive = true } = body;

    if (!title || !image || !productId) {
      return NextResponse.json(
        { error: "title, image, and productId are required" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.company.toString() !== id) {
      return NextResponse.json(
        { error: "Product does not belong to this company" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const existing = company.shopByConcern || [];
    const priority = existing.length;

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title,
      image,
      description,
      product: new mongoose.Types.ObjectId(productId),
      isActive,
      priority,
    };

    const updated = await Company.findByIdAndUpdate(
      id,
      {
        $push: {
          shopByConcern: newItem,
        },
      },
      { returnDocument: "after" }
    ).populate({
      path: "shopByConcern.product",
      select: "name slug company",
      populate: {
        path: "company",
        select: "name slug",
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update company" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: newItem, company: updated });
  } catch (error) {
    console.error("Error creating shop by concern item:", error);
    return NextResponse.json(
      {
        error: "Failed to create shop by concern item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
