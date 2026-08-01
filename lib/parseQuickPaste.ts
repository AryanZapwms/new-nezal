// lib/parseQuickPaste.ts

/**
 * Parses the "Quick Paste" structured text block into a product form object.
 *
 * Expected format (labels are case-insensitive, order doesn't matter):
 *
 * Name: ...
 * Slug: ...
 * Price: ...
 * Discount Price: ...
 * Stock: ...
 * SKU: ...
 *
 * Description:
 * <paragraph>
 *
 * Ingredients:
 * one per line
 *
 * Benefits:
 * one per line
 *
 * Usage:
 * <paragraph>
 *
 * Why You'll Love It:
 * one per line
 *
 * Suitable For:
 * one per line
 *
 * Fragrance Experience:
 * one per line
 *
 * Who Is This For:
 * <paragraph>
 *
 * Skin Concern:
 * <paragraph>
 *
 * Expected Results:
 * <paragraph>
 *
 * Key Ingredients:
 * Name — Benefit   (one per line, em dash or hyphen separator)
 */

export interface ParsedProductData {
  name?: string
  slug?: string
  price?: string
  discountPrice?: string
  stock?: string
  sku?: string
  description?: string
  ingredients?: string
  benefits?: string
  usage?: string
  suitableFor?: string
  whyYoullLoveIt?: string
  fragranceExp?: string
  whoIsItFor?: string
  skinHairConcern?: string
  expectedResults?: string
  keyIngredients?: { name: string; benefit: string }[]
}

// Map of recognized labels -> internal field key + type
type FieldType = "single-line" | "paragraph" | "list" | "key-ingredients"

interface FieldDef {
  key: keyof ParsedProductData
  type: FieldType
}

const LABEL_MAP: Record<string, FieldDef> = {
  "name": { key: "name", type: "single-line" },
  "slug": { key: "slug", type: "single-line" },
  "price": { key: "price", type: "single-line" },
  "discount price": { key: "discountPrice", type: "single-line" },
  "discountprice": { key: "discountPrice", type: "single-line" },
  "stock": { key: "stock", type: "single-line" },
  "sku": { key: "sku", type: "single-line" },

  "description": { key: "description", type: "paragraph" },
  "ingredients": { key: "ingredients", type: "list" },
  "benefits": { key: "benefits", type: "list" },
  "usage": { key: "usage", type: "paragraph" },
  "suitable for": { key: "suitableFor", type: "list" },

  "why you'll love it": { key: "whyYoullLoveIt", type: "list" },
  "why youll love it": { key: "whyYoullLoveIt", type: "list" },
  "why you will love it": { key: "whyYoullLoveIt", type: "list" },

  "fragrance experience": { key: "fragranceExp", type: "list" },
  "who is this for": { key: "whoIsItFor", type: "paragraph" },
  "who is it for": { key: "whoIsItFor", type: "paragraph" },

  "skin concern": { key: "skinHairConcern", type: "paragraph" },
  "skin / hair concern": { key: "skinHairConcern", type: "paragraph" },
  "skin/hair concern": { key: "skinHairConcern", type: "paragraph" },
  "hair concern": { key: "skinHairConcern", type: "paragraph" },

  "expected results": { key: "expectedResults", type: "paragraph" },
  "what results to expect": { key: "expectedResults", type: "paragraph" },

  "key ingredients": { key: "keyIngredients", type: "key-ingredients" },
  "how key ingredients help": { key: "keyIngredients", type: "key-ingredients" },
}

/** Strip leading bullet markers (✓, √, •, -, *, em-dash) from a line */
function stripBulletPrefix(line: string): string {
  return line.replace(/^[\s]*[✓√•\-*–—]\s+/, "").trim()
}

/** Try to match a line as a "Label:" header. Returns the matched FieldDef + remainder text (if inline content follows on same line) */
function matchLabelLine(line: string): { def: FieldDef; inline: string } | null {
  const trimmed = line.trim()
  const colonIdx = trimmed.indexOf(":")
  if (colonIdx === -1) return null

  const labelPart = trimmed.slice(0, colonIdx).trim().toLowerCase()
  const rest = trimmed.slice(colonIdx + 1).trim()

  const def = LABEL_MAP[labelPart]
  if (!def) return null

  return { def, inline: rest }
}

/** Split a "Name — Benefit" or "Name - Benefit" line into parts */
function splitKeyIngredientLine(line: string): { name: string; benefit: string } | null {
  const cleaned = stripBulletPrefix(line)
  // Prefer em-dash / en-dash separator, fall back to " - " (hyphen with spaces)
  const sepMatch = cleaned.match(/\s[—–]\s/) || cleaned.match(/\s-\s/)
  if (!sepMatch) return null
  const idx = cleaned.indexOf(sepMatch[0])
  const name = cleaned.slice(0, idx).trim()
  const benefit = cleaned.slice(idx + sepMatch[0].length).trim()
  if (!name || !benefit) return null
  return { name, benefit }
}

export function parseQuickPaste(raw: string): ParsedProductData {
  const result: ParsedProductData = {}
  if (!raw?.trim()) return result

  const lines = raw.split("\n")

  let currentDef: FieldDef | null = null
  let buffer: string[] = []

  const flush = () => {
    if (!currentDef) { buffer = []; return }

    if (currentDef.type === "single-line") {
      // single-line fields use only the inline value captured at match time
      // (buffer unused for these — handled inline below)
    } else if (currentDef.type === "paragraph") {
      if (currentDef.key === "description") {
        // ── Special case: preserve the tagline (first line) as its own
        // line, joined to the rest of the paragraph with a single \n.
        // This lets ProductDescription render the tagline distinctly.
        const nonEmpty = buffer.filter((l) => l.trim().length > 0)
        if (nonEmpty.length) {
          const [taglineLine, ...rest] = nonEmpty
          const restJoined = rest.join(" ").replace(/\s+/g, " ").trim()
          const text = restJoined ? `${taglineLine.trim()}\n${restJoined}` : taglineLine.trim()
          result.description = text
        }
      } else {
        const text = buffer.join(" ").replace(/\s+/g, " ").trim()
        if (text) (result as any)[currentDef.key] = text
      }
    } else if (currentDef.type === "list") {
      const items = buffer
        .map((l) => stripBulletPrefix(l))
        .filter(Boolean)
      if (items.length) (result as any)[currentDef.key] = items.join("\n")
    } else if (currentDef.type === "key-ingredients") {
      const items = buffer
        .map((l) => splitKeyIngredientLine(l))
        .filter((x): x is { name: string; benefit: string } => !!x)
      if (items.length) result.keyIngredients = items
    }

    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      // blank line — paragraph fields treat this as a hard break but we
      // still keep accumulating until the next label, so just skip
      continue
    }

    const match = matchLabelLine(line)

    if (match) {
      // New label found — flush whatever we were accumulating
      flush()
      currentDef = match.def

      if (match.def.type === "single-line") {
        if (match.inline) (result as any)[match.def.key] = match.inline
      } else if (match.inline) {
        // Label had inline content right after the colon on the same line
        // e.g. "Price: 299" already handled above; but for paragraph/list
        // types like "Description: some text" — treat inline as first line
        buffer.push(match.inline)
      }
      continue
    }

    // Not a label line — belongs to whatever section we're currently in
    if (currentDef) buffer.push(line)
  }

  flush()
  return result
}