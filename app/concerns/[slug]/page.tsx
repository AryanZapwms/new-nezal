"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ChevronRight, Leaf, Home, ArrowRight, Sparkles, CheckCircle2, CircleDot } from "lucide-react"
import ProductCard from "@/components/product-card"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyIngredient {
  name: string
  benefit: string
}

interface Product {
  _id: string
  name: string
  slug: string
  price: number
  discountPrice?: number
  image?: string
  images?: string[]
  variantLabel?: string
  skinTypes?: string[]
  concerns?: string[]
  keyIngredients?: KeyIngredient[]
  collectionSlug?: string
  sizes?: {
    size: string
    unit: string
    quantity: number
    price: number
    discountPrice?: number
    stock: number
  }[]
  stock?: number
  company: { name: string; slug: string }
  flashSale?: {
    saleId: string
    saleName: string
    discountPercent: number
    endsAt: string
  } | null
}

interface RelatedCollection {
  _id: string
  name: string
  slug: string
  tagline: string
  heroImage?: string
  navCategory: string
}

// ─── Concern meta ─────────────────────────────────────────────────────────────

const CONCERN_META: Record<string, {
  label: string
  headline: string
  subheadline: string
  description: string
  didYouKnow?: string
  keyBenefits?: string[]
  helpsAddress?: string[]
  color: string
}> = {
  acne: {
    label: "Acne & Oil Control",
    headline: "Clear Skin Starts Here",
    subheadline: "Targeted formulas that fight acne at the root — without stripping your skin.",
    description: "Acne-prone skin needs active but gentle care. Excess sebum, clogged pores, and bacteria are the three root causes — and the right ingredients address all three together. Nezal's formulations combine Tea Tree, Neem, and Salicylic Acid to control oil, purify pores, and reduce breakouts while keeping your skin barrier intact.",
    didYouKnow: "Salicylic Acid is oil-soluble — meaning it penetrates the pore lining itself to dissolve congestion from within, not just from the surface.",
    keyBenefits: [
      "Controls excess sebum and reduces oily shine",
      "Clears and tightens pores with continued use",
      "Fights acne-causing bacteria naturally",
      "Prevents future breakouts while maintaining skin comfort",
    ],
    helpsAddress: ["Acne", "Oily skin", "Clogged pores", "Blackheads", "Combination skin"],
    color: "#E8F5E9",
  },
  pigmentation: {
    label: "Pigmentation & Dark Spots",
    headline: "Reveal Your Even Skin Tone",
    subheadline: "Brightening actives that fade dark spots and restore radiance — gradually and safely.",
    description: "Pigmentation, dark spots, and uneven tone are among the most common skin concerns in India — triggered by sun exposure, hormonal changes, and post-acne marks. Vitamin C, Niacinamide, Kojic Acid, and Turmeric work to inhibit melanin production and gradually restore a luminous, even complexion without harsh bleaching.",
    didYouKnow: "Vitamin C doesn't just brighten — it also promotes collagen production, which helps skin look firmer and more youthful over time.",
    keyBenefits: [
      "Inhibits melanin production for a more even tone",
      "Fades dark spots and post-acne marks visibly",
      "Supports skin luminosity and radiance",
      "Protects against further sun-induced pigmentation",
    ],
    helpsAddress: ["Dark spots", "Pigmentation", "Uneven skin tone", "Post-acne marks", "Dull complexion"],
    color: "#FFF8E1",
  },
  "dry-skin": {
    label: "Dry Skin",
    headline: "Nourish From Within",
    subheadline: "Rich botanical actives that restore your skin's natural moisture barrier — day and night.",
    description: "Dry skin needs more than surface-level hydration — it needs barrier repair. When the skin's lipid layer is compromised, moisture escapes faster than it can be replenished. Hyaluronic Acid draws water in, Shea Butter seals it, and Aloe Vera soothes the discomfort in between — a three-layer approach to lasting softness.",
    didYouKnow: "Your skin loses up to 500ml of water daily through a process called Transepidermal Water Loss (TEWL) — moisturising actively slows this down.",
    keyBenefits: [
      "Replenishes lost moisture at multiple skin layers",
      "Supports the skin's natural lipid barrier",
      "Reduces flakiness and rough skin texture",
      "Keeps skin soft and comfortable through the day",
    ],
    helpsAddress: ["Dry skin", "Dehydrated skin", "Flakiness", "Skin tightness", "Winter dryness"],
    color: "#FFF3E0",
  },
  hairfall: {
    label: "Hair Fall & Hair Strength",
    headline: "Stop the Fall. Start the Growth.",
    subheadline: "Science-backed actives and Ayurvedic botanicals for stronger, fuller-looking hair.",
    description: "Hair fall can be triggered by stress, nutritional gaps, hormonal shifts, or a weakened scalp environment. Redensyl and Anagain work at the follicle level to support the hair growth cycle, while Amla, Shikakai, and Bhringraj — time-tested Ayurvedic actives — nourish roots and improve scalp circulation from outside.",
    didYouKnow: "Hair grows in cycles — Redensyl works by reactivating follicles in the resting (telogen) phase, encouraging them back into active growth (anagen).",
    keyBenefits: [
      "Supports the hair growth cycle at follicle level",
      "Visibly reduces hair fall with consistent use",
      "Strengthens hair from root to tip",
      "Nourishes scalp for a healthier growth environment",
    ],
    helpsAddress: ["Hair fall", "Hair thinning", "Weak roots", "Brittle hair", "Post-stress hair loss"],
    color: "#FCE4EC",
  },
  "hair-growth": {
    label: "Hair Growth & Scalp Nourishment",
    headline: "Feed Your Roots. See the Difference.",
    subheadline: "A nourished scalp is the foundation of healthy, strong, growing hair.",
    description: "Healthy hair starts at the scalp. Poor circulation, product buildup, and dryness all slow growth and weaken hair at the root. Neem and Black Pepper stimulate circulation and purify the scalp, while our serum's patented actives signal follicles to re-enter the active growth phase — giving hair a genuine fresh start.",
    didYouKnow: "The scalp has approximately 100,000 hair follicles — each one needs oxygen, nutrients, and a clean environment to produce its best hair.",
    keyBenefits: [
      "Stimulates scalp circulation for better nutrient delivery",
      "Purifies scalp buildup that blocks follicles",
      "Supports active hair growth phase (anagen)",
      "Strengthens new growth from first emergence",
    ],
    helpsAddress: ["Slow hair growth", "Scalp buildup", "Weak follicles", "Hair thinning", "Scalp dryness"],
    color: "#E0F2F1",
  },
  dullness: {
    label: "Dull & Tired Skin",
    headline: "Wake Your Skin Up",
    subheadline: "Gentle exfoliation and brightening actives that restore radiance when skin looks flat and lifeless.",
    description: "Dull skin is usually a signal — of dead cell buildup on the surface, sluggish circulation, or dehydration beneath. The answer is a two-step approach: gently exfoliate what's sitting on top, then flood the skin with brightening actives underneath. Ubtan, Vitamin C, and Papaya Enzyme do exactly that.",
    didYouKnow: "Dead skin cells accumulate faster with age — a 20-year-old sheds cells every 14 days, while for a 40-year-old it can take up to 28 days.",
    keyBenefits: [
      "Removes dull dead surface cells for instant radiance",
      "Boosts skin luminosity and healthy glow",
      "Improves skin texture and evenness",
      "Gives skin a refreshed, energised appearance",
    ],
    helpsAddress: ["Dull skin", "Tired complexion", "Uneven texture", "Lack of glow", "Post-travel skin"],
    color: "#F3E5F5",
  },
  brightening: {
    label: "Skin Brightening & Glow",
    headline: "Glow Isn't Luck. It's the Right Ingredients.",
    subheadline: "Antioxidant and brightening actives that deliver a visible, healthy radiance every day.",
    description: "Genuine skin glow comes from within — consistent hydration, active exfoliation, and antioxidant protection working together over time. Saffron, Vitamin C, and Pineapple Extract support luminosity from the inside of the cell outward, while Aloe Vera ensures the skin's surface stays smooth enough to reflect light properly.",
    didYouKnow: "Skin that is well-hydrated reflects light more evenly — which is why hydration is the most underrated step in any glow routine.",
    keyBenefits: [
      "Supports natural skin luminosity and radiance",
      "Evens out skin tone for a more uniform glow",
      "Antioxidant protection for long-term skin brightness",
      "Makes skin appear fresher and more awake",
    ],
    helpsAddress: ["Lack of glow", "Uneven skin tone", "Dull complexion", "Sun-exposed skin", "Everyday brightening"],
    color: "#FFFDE7",
  },
  hydration: {
    label: "Deep Hydration",
    headline: "Drink Deep. Glow Long.",
    subheadline: "Hyaluronic acid and botanical humectants for skin that stays plump, soft, and radiant all day.",
    description: "Dehydrated skin looks dull, feels tight, and shows lines faster. The difference between hydration and moisturisation matters: Hyaluronic Acid pulls water into the skin (hydration), while Shea Butter and Aloe Vera seal it in (moisturisation). Your complete deep hydration routine works both steps together.",
    didYouKnow: "One gram of Hyaluronic Acid can hold up to six litres of water — making it the most efficient moisture-binding molecule found in nature.",
    keyBenefits: [
      "Attracts and locks in moisture at multiple skin layers",
      "Restores plumpness and smoothness visibly",
      "Reduces the appearance of dehydration lines",
      "Maintains moisture balance through the day",
    ],
    helpsAddress: ["Dehydrated skin", "Dull skin", "Skin tightness", "Mature skin", "Air-conditioned or heated environments"],
    color: "#E3F2FD",
  },
  "sensitive-skin": {
    label: "Sensitive Skin Care",
    headline: "Gentle Is Powerful",
    subheadline: "Formulations that calm, comfort, and care — without triggering what you're trying to avoid.",
    description: "Sensitive skin reacts to what others don't notice — fragrances, surfactants, temperature changes. The key isn't avoiding all ingredients, it's choosing the right ones: Aloe Vera soothes redness, Oatmeal forms a protective barrier, and Milk Proteins condition gently. No stripping. No irritation. Just calm, healthy skin.",
    didYouKnow: "Sensitive skin isn't a skin type — it's a skin condition that can affect any skin type and can change across seasons and life stages.",
    keyBenefits: [
      "Calms redness and reactive skin responses",
      "Strengthens the skin's protective barrier",
      "Deeply soothes without causing further irritation",
      "Suitable for daily use even on the most delicate skin",
    ],
    helpsAddress: ["Sensitive skin", "Reactive skin", "Redness", "Skin irritation", "Fragrance-sensitive skin"],
    color: "#FBE9E7",
  },
  "scalp-purification": {
    label: "Scalp Purification & Freshness",
    headline: "A Clean Scalp Is the Foundation of Healthy Hair",
    subheadline: "Herbal actives that remove buildup, balance oil, and refresh the scalp at every wash.",
    description: "A congested, oily, or product-loaded scalp blocks hair follicles and slows healthy growth. Neem's antibacterial properties clear bacteria, Black Pepper stimulates circulation, and our conditioner restores the moisture balance post-cleanse — leaving the scalp clean, balanced, and ready to support healthy hair.",
    didYouKnow: "Scalp skin renews itself every 24–30 days — regular, effective cleansing ensures dead cells and sebum don't accumulate into a barrier against healthy hair growth.",
    keyBenefits: [
      "Removes scalp buildup and excess sebum",
      "Antibacterial care keeps scalp environment balanced",
      "Stimulates scalp circulation for better follicle health",
      "Leaves scalp feeling fresh and comfortable all day",
    ],
    helpsAddress: ["Scalp buildup", "Oily scalp", "Dandruff", "Scalp congestion", "Post-workout freshness"],
    color: "#F1F8E9",
  },
  "frizz-control": {
    label: "Frizz Control & Dry Hair",
    headline: "Smooth, Shiny, Manageable — Every Day",
    subheadline: "Deep conditioning actives that tame frizz, restore shine, and make hair easier to manage.",
    description: "Frizz is almost always a moisture problem. When the hair shaft is dry, it absorbs atmospheric humidity and swells unevenly — causing frizz and flyaways. Seaweed Extract's 60+ minerals and Panthenol penetrate the hair shaft to restore internal moisture, while Amla and Shikakai smooth the cuticle from outside.",
    didYouKnow: "Hair cuticles are like roof tiles — when dry and raised, they catch moisture from the air and frizz. Conditioned cuticles lie flat and reflect light instead.",
    keyBenefits: [
      "Smooths hair cuticles for frizz-free manageability",
      "Restores deep moisture to dry and brittle strands",
      "Improves shine and makes hair easier to style",
      "Reduces breakage caused by dryness and friction",
    ],
    helpsAddress: ["Frizzy hair", "Dry hair", "Flyaways", "Rough hair texture", "Colour-treated hair"],
    color: "#E8EAF6",
  },
  "anti-ageing": {
    label: "Anti-Ageing Care",
    headline: "Skin That Knows Better With Time",
    subheadline: "Science-forward actives that support skin's natural renewal and slow visible signs of ageing.",
    description: "Skin ages because collagen production slows, cells renew less efficiently, and environmental stressors accumulate over years. Hyaluronic Acid restores plumpness, Vitamin C stimulates collagen, Niacinamide firms and evens, and Black Grape's resveratrol provides antioxidant protection. Together they slow what you see in the mirror.",
    didYouKnow: "After age 25, the skin produces approximately 1% less collagen every year — which is exactly why starting early with protective and boosting actives matters.",
    keyBenefits: [
      "Supports collagen production for firmer-looking skin",
      "Reduces the visible appearance of fine lines",
      "Improves skin luminosity and evenness over time",
      "Provides antioxidant defence against premature ageing",
    ],
    helpsAddress: ["Fine lines", "Loss of firmness", "Dull mature skin", "Uneven ageing skin tone", "Environmental skin damage"],
    color: "#F8E1E7",
  },
  "daily-skin-care": {
    label: "Daily Skin Care",
    headline: "Show Up For Your Skin — Every Single Day",
    subheadline: "Simple, effective everyday care that keeps skin clean, balanced, and comfortable.",
    description: "The most effective skincare isn't complicated — it's consistent. A gentle face wash, a lightweight gel, and a nourishing lotion used daily do more for your skin than an elaborate routine used occasionally. Aloe Vera, Glycerine, and botanical soap bases make this easy and enjoyable to maintain.",
    didYouKnow: "Consistency matters more than intensity in skincare — using the right products daily for 30 days delivers more visible results than any single treatment.",
    keyBenefits: [
      "Gentle daily cleansing without disrupting skin balance",
      "Lightweight hydration that doesn't feel heavy",
      "Keeps skin comfortable and healthy-looking through the day",
      "Simple routine anyone can maintain every morning",
    ],
    helpsAddress: ["Everyday skin care", "Normal skin", "Combination skin", "All ages", "Family use"],
    color: "#F3F5EF",
  },
  "daily-nourishment": {
    label: "Daily Skin Nourishment",
    headline: "Feed Your Skin What It Needs Every Day",
    subheadline: "Rich botanical emollients that keep skin soft, supple, and visibly healthy between washes.",
    description: "Skin nourishment isn't a luxury — it's maintenance. Every day the skin faces environmental stressors that strip its surface lipids. Replenishing with Shea Butter, Glycerine, and botanical extracts keeps the barrier intact, prevents long-term dryness, and maintains the healthy appearance that consistent care creates.",
    didYouKnow: "The skin's acid mantle — its natural protective film — has a pH of around 4.7. Products that match this pH preserve it; those that disrupt it cause dryness and sensitivity.",
    keyBenefits: [
      "Replenishes surface lipids lost during the day",
      "Maintains skin softness and comfort between washes",
      "Supports a healthy, well-nourished skin appearance",
      "Lightweight enough for daily use on face and body",
    ],
    helpsAddress: ["Everyday nourishment", "Dry skin", "Normal skin", "Post-wash care", "Body care"],
    color: "#FFF9C4",
  },
  "sun-tan-care": {
    label: "Sun Exposure & Tan Care",
    headline: "Undo the Day. Restore Your Glow.",
    subheadline: "Brightening and soothing actives that address tan, dark spots, and sun-stressed skin.",
    description: "Sun exposure is the single largest driver of skin pigmentation in India. UVA rays penetrate deep to trigger melanin production, while UVB rays cause surface burn and dryness. Post-sun care needs two things: soothing redness and heat, and gradually fading the melanin already produced — which is exactly what Aloe Vera and Vitamin C do together.",
    didYouKnow: "UVA rays (the tan-causing ones) can penetrate glass — so even sitting by a car window or office window causes cumulative pigmentation over time.",
    keyBenefits: [
      "Soothes sun-exposed and heat-stressed skin",
      "Helps fade tan and sun-induced pigmentation gradually",
      "Restores moisture lost through sun exposure",
      "Supports skin recovery and glow restoration",
    ],
    helpsAddress: ["Sun tan", "Sun-induced pigmentation", "Post-beach skin", "Heat-stressed skin", "Outdoor lifestyle"],
    color: "#FFE0B2",
  },
  "deep-cleansing": {
    label: "Deep Cleansing & Detox",
    headline: "Clear Out. Start Fresh.",
    subheadline: "Powerful yet gentle formulas that draw out impurities and reset your skin.",
    description: "Your skin collects more than it shows — pollution particles, excess sebum, dead cells, and environmental toxins accumulate in pores daily. Apple Cider Vinegar tones and balances pH, Charcoal acts like a magnet to draw out deep impurities, and Lemongrass purifies with natural antimicrobial properties — a comprehensive daily detox reset.",
    didYouKnow: "Activated Charcoal has a surface area of up to 2,000 square metres per gram — all those surfaces attract and hold impurities before washing them away.",
    keyBenefits: [
      "Deep-cleanses pores without aggressive scrubbing",
      "Draws out environmental impurities and excess oil",
      "Balances skin pH after cleansing",
      "Leaves skin feeling genuinely clean and refreshed",
    ],
    helpsAddress: ["Congested pores", "Oily skin", "City pollution exposure", "Product buildup", "Blackheads"],
    color: "#ECEFF1",
  },
  "rough-texture": {
    label: "Rough & Uneven Skin Texture",
    headline: "Smooth Is the Goal. Exfoliation Is the Way.",
    subheadline: "Gentle mechanical and enzyme exfoliants that reveal smoother, softer skin beneath.",
    description: "Rough skin texture is almost always caused by surface dead cell buildup — cells that have lost moisture and are sitting flat on top of your skin. Exfoliating them away reveals the fresher, smoother cells beneath. Green Tea Scrub and Orange Peel in Nezal's Aissis soaps do this mechanically and gently - no over-stripping.",
    didYouKnow: "Skin cells complete their journey from the base layer to the surface in 28–40 days — regular exfoliation speeds up the visual renewal without rushing the biology.",
    keyBenefits: [
      "Removes dead skin cells for instantly smoother texture",
      "Improves skin tone and radiance after exfoliation",
      "Supports better absorption of serums and moisturisers",
      "Safe for regular weekly use without irritation",
    ],
    helpsAddress: ["Rough skin texture", "Uneven tone", "Bumpy skin", "Clogged pores", "Dull surface skin"],
    color: "#F5F0E8",
  },
  "soft-skin": {
    label: "Soft & Smooth Skin",
    headline: "The Feeling That Says Everything",
    subheadline: "Nourishing actives that condition, smooth, and soften skin from the very first wash.",
    description: "Genuinely soft skin isn't just moisturised — it's well-conditioned at the surface and nourished beneath. Milk Proteins condition the outer layer, Shea Butter repairs the barrier beneath, and Rose Aqua keeps the surface calm and hydrated. Together they deliver the kind of softness you can feel throughout the day.",
    didYouKnow: "Skin softness is largely determined by the condition of the stratum corneum — the outermost skin layer. Conditioning this layer even for a few days produces a noticeable improvement in feel.",
    keyBenefits: [
      "Conditions and softens the outer skin layer",
      "Deep nourishment beneath the surface for lasting results",
      "Supports a smooth and even skin texture",
      "Maintains comfort and softness through the day",
    ],
    helpsAddress: ["Rough skin", "Loss of softness", "Dry skin feel", "Post-wash tightness", "Body skin care"],
    color: "#FDE8EC",
  },
  "summer-skin-care": {
    label: "Summer Skin Care",
    headline: "Stay Fresh. Stay Cool. Stay Glowing.",
    subheadline: "Cooling, lightweight formulas that keep skin comfortable, balanced, and refreshed in the heat.",
    description: "Summer skin faces a unique combination of challenges — excess oil production, sweat-mixed pore congestion, UV exposure, and dehydration from indoor cooling. The answer is lightweight hydration, cooling botanicals, and gentle daily cleansing that keeps the surface balanced without feeling heavy or greasy.",
    didYouKnow: "Heat increases skin temperature by up to 5°C, which speeds up sebum production significantly — making daily cleansing more important in summer than any other season.",
    keyBenefits: [
      "Provides cooling relief and refreshing sensation",
      "Controls excess oil in warm and humid conditions",
      "Keeps skin balanced and comfortable through the day",
      "Lightweight formula that doesn't clog pores in heat",
    ],
    helpsAddress: ["Summer oiliness", "Heat-flushed skin", "Sweat-mixed congestion", "UV exposure", "Humidity-related breakouts"],
    color: "#E0F7FA",
  },
  "everyday-freshness": {
    label: "Everyday Freshness",
    headline: "Feel It. Own It. All Day.",
    subheadline: "Uplifting fragrances and gentle cleansing for skin that smells and feels fresh from morning to evening.",
    description: "Freshness is both a feeling and a scent — and the right product delivers both at once. Apple Blossom, Orange, and Coffee Bean formulations in Nezal's range use mood-lifting botanicals that cleanse, invigorate the senses, and leave a light, pleasant fragrance on the skin that carries naturally through the day.",
    didYouKnow: "Fragrance molecules interact differently with each person's skin chemistry — which is why the same product can smell subtly different on two people, and why natural botanical scents feel more personal.",
    keyBenefits: [
      "Uplifting fragrance that lasts naturally through the day",
      "Gentle effective cleansing for daily use",
      "Refreshes mood and senses alongside the skin",
      "Suitable for daily use by the whole family",
    ],
    helpsAddress: ["Everyday freshness", "Morning routine", "Active lifestyle", "Office and outdoor wear", "Family use"],
    color: "#F0F4C3",
  },
  "stress-relief": {
    label: "Stress Relief & Relaxation",
    headline: "Your Skin Feels Stress Too",
    subheadline: "Aromatherapy-powered botanicals that calm the body, soothe the senses, and restore balance.",
    description: "Stress isn't just in your head — it shows on your skin. Cortisol (the stress hormone) triggers oil production, disrupts the skin barrier, and slows cell renewal. Lavender, Cedarwood, and aromatherapy-grade essential oils activate the body's parasympathetic system, genuinely calming both skin and mind from the outside in.",
    didYouKnow: "Lavender Essential Oil has been shown in studies to reduce cortisol levels and heart rate — making a lavender bath more than just a nice experience, it's a measurable physiological response.",
    keyBenefits: [
      "Calms the nervous system through aromatherapy",
      "Reduces skin reactivity triggered by stress",
      "Promotes deep physical and mental relaxation",
      "Improves sleep quality when used in an evening routine",
    ],
    helpsAddress: ["Stress-triggered skin issues", "Anxiety and tension", "Disrupted sleep", "Reactive skin", "Evening care"],
    color: "#EDE7F6",
  },
  "spa-at-home": {
    label: "Spa at Home",
    headline: "You Deserve a Ritual, Not Just a Routine",
    subheadline: "A complete at-home spa experience — from detox soak to body oil to lasting skin comfort.",
    description: "A spa experience doesn't require a spa. It requires intention and the right products. Our Spa at Home ritual walks you through a structured self-care sequence: detox the skin with Himalayan Salt, relax muscles with Cedarwood Oil, then seal in hydration and fragrance with Frangipani Body Lotion. Twenty minutes. Complete transformation.",
    didYouKnow: "Studies show that ritual-based self-care (rather than rushed routine) reduces perceived stress by up to 30% — the deliberate act of taking time is as therapeutic as the ingredients.",
    keyBenefits: [
      "Complete spa sequence from cleansing to moisturising",
      "Detoxifies and softens skin through mineral bathing",
      "Relaxes muscles and calms the mind with aromatherapy",
      "Leaves skin deeply nourished and beautifully fragranced",
    ],
    helpsAddress: ["Self-care rituals", "Relaxation", "Muscle tension", "Gifting occasion", "Weekly wellness"],
    color: "#E8F0E3",
  },
  "luxury-gifting": {
    label: "Luxury Gifting",
    headline: "Give Something That Actually Means Something",
    subheadline: "Curated  collections for gifting occasions that deserve more than the ordinary.",
    description: "A great gift tells someone you thought about what they'd actually enjoy — not just what was easy to buy. Nezal's signature gift range brings together the finest soaps, body care, and Aissis Collection luxuries in beautifully presented selections that feel considered, personal, and genuinely special for every gifting occasion.",
    didYouKnow: "Research shows that sensory gifts — those that engage smell and touch — are remembered significantly longer than conventional gifts, because they create repeat experiences.",
    keyBenefits: [
      "Exclusive presentation, worthy of special occasions",
      "Products the recipient will genuinely use and love",
      "A discovery experience of the Nezal range",
      "Suitable for corporate, festive, and personal gifting",
    ],
    helpsAddress: ["Festival gifting", "Corporate gifting", "Wedding gifting", "Birthdays", "Luxury personal care"],
    color: "#FBF3E7",
  },
}

// Explicit display order (top → bottom), so the list always renders
// acne first and the last concern last, regardless of object key order.
const CONCERN_ORDER: string[] = [
  "acne",
  "pigmentation",
  "dry-skin",
  "hairfall",
  "hair-growth",
  "dullness",
  "brightening",
  "hydration",
  "sensitive-skin",
  "scalp-purification",
  "frizz-control",
  "anti-ageing",
  "daily-skin-care",
  "daily-nourishment",
  "sun-tan-care",
  "deep-cleansing",
  "rough-texture",
  "soft-skin",
  "summer-skin-care",
  "everyday-freshness",
  "stress-relief",
  "spa-at-home",
  "luxury-gifting",
]

const DEFAULT_META = {
  label: "Concern",
  headline: "Products for Your Concern",
  subheadline: "Herbal formulas curated for your specific skin need.",
  description: "Explore our range of herbal products curated for this concern.",
  didYouKnow: undefined,
  keyBenefits: undefined,
  helpsAddress: undefined,
  color: "#FAF7F2",
}

const CATEGORY_LABELS: Record<string, string> = {
  "face-care": "Face Care",
  "body-care": "Body Care",
  "hair-care": "Hair Care",
  "gift-kits": "Gift Kits",
}

function toLabel(slug: string) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Related Collection Card ──────────────────────────────────────────────────

function RelatedCollectionCard({ col }: { col: RelatedCollection }) {
  return (
    <Link
      href={`/collections/${col.slug}`}
      className="group flex flex-col gap-4 p-5 rounded-2xl bg-white border border-[var(--color-border)] hover:shadow-md hover:border-[var(--color-brand-primary)]/30 transition-all"
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-cream)] relative">
        {col.heroImage ? (
          <Image src={col.heroImage} alt={col.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Leaf size={28} className="text-[var(--color-brand-primary)]/30" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-primary)]">
          {CATEGORY_LABELS[col.navCategory] ?? toLabel(col.navCategory)}
        </span>
        <h3 className="font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-brand-primary)] transition-colors">
          {col.name}
        </h3>
        {col.tagline && (
          <p className="text-sm text-[var(--color-text-muted)]">{col.tagline}</p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] group-hover:gap-2 transition-all mt-auto">
        Explore <ArrowRight size={13} />
      </span>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConcernSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] animate-pulse">
      <div className="h-64 bg-neutral-100" />
      <div className="container-nezal py-12 flex flex-col gap-6">
        <div className="h-6 w-48 bg-neutral-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConcernPage() {
  const params = useParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<RelatedCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const meta = CONCERN_META[slug] ?? DEFAULT_META

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/concerns/${slug}`)
        if (!res.ok) throw new Error("Failed")
       const data = await res.json()
        const concern = data.concern ?? data          // unwrap the nested object
        setProducts(concern.products ?? [])
        setCollections(data.collections ?? [])
        if ((concern.products ?? []).length === 0 && (data.collections ?? []).length === 0) {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) return <ConcernSkeleton />

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

      {/* ── Hero ── */}
      <section style={{ backgroundColor: meta.color }} className="border-b border-[var(--color-border)]">
        <div className="container-nezal py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
              <Home size={13} /> Home
            </Link>
            <ChevronRight size={13} />
            <Link href="/concerns" className="hover:text-[var(--color-brand-primary)]">
              Concerns
            </Link>
            <ChevronRight size={13} />
            <span className="text-[var(--color-text-heading)] font-medium">{meta.label}</span>
          </nav>

          <div className="flex flex-row  gap-4 max-[100%]">
            <div className="">
            <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
              <Leaf size={13} /> Skin Concern
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--color-text-heading)] leading-tight">
              {meta.headline}
            </h1>
            <p className="text-lg text-[#f1ab08] leading-relaxed  my-4 italic ">
              "{meta.subheadline}"
            </p>
            <p className="text-sm text-[var(--color-text-body)] my-4 leading-relaxed max-w-xl">
              {meta.description}
            </p>
            {!notFound && (
              <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                {products.length} product{products.length !== 1 ? "s" : ""} for {meta.label}
              </p>
            )}
            </div>
            <div className=" rounded-xl ">
              {/* ── Did You Know / Key Benefits / Helps Address ── */}
              {(meta.didYouKnow || (meta.keyBenefits && meta.keyBenefits.length > 0) || (meta.helpsAddress && meta.helpsAddress.length > 0)) && (
                <section className="bg-white border-b border-[var(--color-border)] rounded-xl">
                  <div className="container-nezal py-10 flex flex-col gap-8 rounded-xl">

                    {meta.didYouKnow && (
                      <div className="flex gap-3 items-start p-5 rounded-2xl bg-[var(--color-brand-primary)]/5 border border-[var(--color-brand-primary)]/20">
                        <Sparkles size={18} className="text-[var(--color-brand-primary)] shrink-0 mt-0.5" />
                        <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                          <span className="font-bold text-[var(--color-brand-primary)]">Did you know? </span>
                          {meta.didYouKnow}
                        </p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-8">
                      {meta.keyBenefits && meta.keyBenefits.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
                            Key Benefits
                          </h3>
                          <ul className="flex flex-col gap-2.5">
                            {meta.keyBenefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-text-body)] leading-relaxed">
                                <CheckCircle2 size={16} className="text-[var(--color-brand-primary)] shrink-0 mt-0.5" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      </div>

                    
                      {meta.helpsAddress && meta.helpsAddress.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
                            Helps Address
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {meta.helpsAddress.map((item, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-cream)] border border-[var(--color-border)] text-sm text-[var(--color-text-heading)]"
                              >
                                <CircleDot size={12} className="text-[var(--color-brand-primary)]" />
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                
                </section>
              )}
             </div>
          </div>
        </div>
      </section>

    

      {/* ── Recommended Collections ── */}
      {collections.length > 0 && (
        <section className="bg-white border-b border-[var(--color-border)] ">
          <div className="container-nezal py-10">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-heading)]">
                  Collections for {meta.label}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Explore our full ranges specifically crafted for this concern.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {collections.map((col) => (
                  <RelatedCollectionCard key={col._id} col={col} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Products ── */}
      <section className="container-nezal py-12">
        {notFound || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">
              No products found for this concern yet.
            </p>
            <Link
              href="/shop"
              className="text-[var(--color-brand-primary)] font-semibold hover:underline"
            >
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
              All Products for {meta.label}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((product) => (
                <div key={product._id}>
                  <ProductCard
  id={product._id}
  name={product.name}
  slug={product.slug}
  price={product.price}
  discountPrice={product.discountPrice}
  image={product.image}
  images={product.images}
  variantLabel={product.variantLabel}
  skinTypes={product.skinTypes}
  concerns={product.concerns}
  keyIngredients={product.keyIngredients}
  company={product.company}
  hasMultipleSizes={!!product.sizes?.length}
  sizes={product.sizes as any}
  stock={product.stock}
  flashSale={product.flashSale}
/>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Other Concerns ── */}
      <section className="bg-[var(--color-bg-cream)] border-t border-[var(--color-border)]">
        <div className="container-nezal py-10">
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-[var(--color-text-heading)]">
              Explore Other Concerns
            </h2>
            <div className="flex flex-wrap gap-2">
              {CONCERN_ORDER
                .filter((s) => s !== slug)
                .map((s) => {
                  const m = CONCERN_META[s]
                  if (!m) return null
                  return (
                    <Link
                      key={s}
                      href={`/concerns/${s}`}
                      className="px-4 py-2 rounded-full border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-heading)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
                    >
                      {m.label}
                    </Link>
                  )
                })}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}