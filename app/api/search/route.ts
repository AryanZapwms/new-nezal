// app/api/search/route.ts
//
// Unified search endpoint powering the header SearchBar dropdown.
// Returns up to N matches across three categories in one response:
//   - products:    fuzzy name/description match (typo-tolerant)
//   - concerns:    matched against the known concern list (mirrors
//                  the mega menu's CONCERNS array)
//   - ingredients: distinct ingredient names matched from `ingredients`
//                  and `keyIngredients.name` across all active products
//
// GET /api/search?q=tea+tree

import { NextRequest, NextResponse } from "next/server"
import Fuse from "fuse.js"
import { connectDB } from "@/lib/db"
import { Product } from "@/lib/models/product"
import { getActiveFlashSaleMap, applyFlashSaleToList } from "@/lib/flashSale"

const MAX_PER_GROUP = 5

// Keep this in sync with the CONCERNS list used in the header mega menu.
const CONCERNS = [
  { label: "Acne", slug: "acne" },
  { label: "Pigmentation", slug: "pigmentation" },
  { label: "Open Pores", slug: "open-pores" },
  { label: "Hydration", slug: "hydration" },
  { label: "Hair Fall", slug: "hairfall" },
  { label: "Dryness", slug: "dryness" },
]

const FUSE_OPTIONS = {
  threshold: 0.4,        // 0 = exact only, 1 = match almost anything
  ignoreLocation: true,  // typo can land anywhere in the word, not just the start
  minMatchCharLength: 2,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || ""

    if (q.length < 2) {
      return NextResponse.json({ products: [], concerns: [], ingredients: [] })
    }

    await connectDB()

    // ── Products (fuzzy) ──
    // Pull every active product's searchable fields, then let Fuse rank by
    // closeness to the typed query — this is what makes "sleo vera" find
    // "Aloe Vera" even though it's not a substring match.
    const allProducts = await Product.find(
      { isActive: true },
      { _id: 1, name: 1, description: 1, price: 1, discountPrice: 1, image: 1, company: 1 }
    )
      .populate("company", "slug name")
      .lean()

    const productFuse = new Fuse(allProducts, {
      ...FUSE_OPTIONS,
      keys: [
        { name: "name", weight: 0.7 },
        { name: "description", weight: 0.3 },
      ],
    })
    const products = productFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item)

    // Merge in flash-sale pricing so a searched product shows the same
    // sale price / ribbon data as the shop grid and product page.
    const flashSaleMap = await getActiveFlashSaleMap()
    const productsWithSales = applyFlashSaleToList(products, flashSaleMap)

    // ── Concerns (static list, fuzzy) ──
    const concernFuse = new Fuse(CONCERNS, { ...FUSE_OPTIONS, keys: ["label"] })
    const concerns = concernFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item)

    // ── Ingredients (distinct names, fuzzy) ──
    // First collect every distinct ingredient name across active products,
    // then fuzzy-match against that distinct list (cheaper than matching
    // per-document, and gives clean deduped results).
    const ingredientDocs = await Product.find(
      { isActive: true },
      { ingredients: 1, "keyIngredients.name": 1 }
    ).lean()

    const seen = new Set<string>()
    const distinctIngredients: { name: string; slug: string }[] = []

    for (const doc of ingredientDocs) {
      const names = [
        ...(doc.ingredients || []),
        ...((doc.keyIngredients || []).map((k: any) => k.name)),
      ]
      for (const name of names) {
        if (!name) continue
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        distinctIngredients.push({ name, slug: slugify(name) })
      }
    }

    const ingredientFuse = new Fuse(distinctIngredients, { ...FUSE_OPTIONS, keys: ["name"] })
    const ingredients = ingredientFuse.search(q).slice(0, MAX_PER_GROUP).map((r) => r.item)

    return NextResponse.json({ products: productsWithSales, concerns, ingredients })
  } catch (error) {
    console.error("[search] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}