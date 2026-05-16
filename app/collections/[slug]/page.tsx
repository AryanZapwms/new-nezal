"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ChevronRight, Home, Leaf, ShieldCheck, FlaskConical, Star, ChevronDown, ChevronUp } from "lucide-react"
import ProductCard from "@/components/product-card"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyIngredient {
  name: string
  benefit: string
  icon?: string
}

interface RitualStep {
  step: number
  label: string
  description: string
  linkedCollectionSlug?: string
}

interface FAQ {
  question: string
  answer: string
}

interface Collection {
  _id: string
  name: string
  slug: string
  tagline: string
  heroImage?: string
  heroHeadline: string
  heroSubheadline: string
  storyText: string
  keyIngredients: KeyIngredient[]
  concerns: string[]
  ritualSteps: RitualStep[]
  relatedCollections: string[]
  faq: FAQ[]
  navCategory: string
}

interface Product {
  _id: string
  name: string
  price: number
  discountPrice?: number
  image?: string
  images?: string[]
  variantLabel?: string
  skinTypes?: string[]
  concerns?: string[]
  keyIngredients?: KeyIngredient[]
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
}

interface RelatedCollection {
  _id: string
  name: string
  slug: string
  tagline: string
  heroImage?: string
  navCategory: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLabel(slug: string) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const NAV_CATEGORY_LABELS: Record<string, string> = {
  "face-care": "Face Care",
  "body-care": "Body Care",
  "hair-care": "Hair Care",
  "gift-kits": "Gift Kits",
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CollectionHero({ collection }: { collection: Collection }) {
  return (
    <section className="relative bg-[var(--color-bg-cream)] overflow-hidden">
      <div className="container-nezal py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Text */}
          <div className="flex flex-col gap-6">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
                <Home size={14} /> Home
              </Link>
              <ChevronRight size={14} />
              <Link
                href={`/collections`}
                className="hover:text-[var(--color-brand-primary)]"
              >
                Collections
              </Link>
              <ChevronRight size={14} />
              <span className="text-[var(--color-text-heading)] font-medium">
                {collection.name}
              </span>
            </nav>

            {/* Tag */}
            <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
              <Leaf size={14} />
              {NAV_CATEGORY_LABELS[collection.navCategory] ?? toLabel(collection.navCategory)}
            </span>

            <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-text-heading)] leading-tight">
              {collection.heroHeadline}
            </h1>
{/* 
            <p className="text-lg text-[var(--color-text-body)] leading-relaxed max-w-lg">
              {collection.heroSubheadline}
            </p> */}

           
            <p className="text-[var(--color-text-body)] leading-relaxed text-lg">
              {collection.storyText}
            </p>
         

            <div className="flex flex-row gap-4 justify-center">
            {[
              { icon: <Leaf size={18} />, label: "100% Herbal Formulated" },
              { icon: <ShieldCheck size={18} />, label: "Dermatologist Tested" },
              { icon: <FlaskConical size={18} />, label: "No Harsh Chemicals" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-cream)] border border-[var(--color-border)]"
              >
                <span className="text-[var(--color-brand-primary)]">{item.icon}</span>
                <span className="text-sm font-medium text-[var(--color-text-heading)]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="#variants"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Explore the Collection
              </a>
              <a
                href="#ritual"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-heading)] font-semibold hover:bg-white transition-colors"
              >
                See the Ritual
              </a>
            </div>
          </div>

          {/* Image */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-white shadow-sm">
            {collection.heroImage ? (
              <Image
                src={collection.heroImage}
                alt={collection.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Image
                  src="/companylogo.png"
                  alt="Nezal"
                  width={120}
                  height={120}
                  className="object-contain opacity-30"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CollectionStory({ collection }: { collection: Collection }) {
  return (
    <section className="bg-white border-b border-[var(--color-border)]">
      <div className="container-nezal py-14">
        <div className=" gap-10">
          {/* Story */}
          {/* <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              The Story Behind {collection.name}
            </h2>
            
          </div> */}

          {/* Trust signals */}
          


        </div>
      </div>
    </section>
  )
}


// function IngredientGrid({ ingredients }: { ingredients: KeyIngredient[] }) {
//   if (!ingredients?.length) return null
//   return (
//     <section className="bg-[var(--color-bg-cream)]">
//       <div className="container-nezal py-14">
//         <div className="flex flex-col gap-8">
//           <div className="text-center">
//             <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
//               Key Ingredients
//             </h2>
//             <p className="text-[var(--color-text-muted)] mt-2">
//               Nature's most potent actives, carefully selected for your skin
//             </p>
//           </div>

//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             {ingredients.map((ing) => (
//               <div
//                 key={ing.name}
//                 className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-[var(--color-border)] hover:shadow-md transition-shadow"
//               >
//                 <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)]/10 flex items-center justify-center">
//                   <Leaf size={20} className="text-[var(--color-brand-primary)]" />
//                 </div>
//                 <span className="font-semibold text-[var(--color-text-heading)] text-sm">
//                   {ing.name}
//                 </span>
//                 <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">
//                   {ing.benefit}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   )
// }


function ConcernPills({ concerns }: { concerns: string[] }) {
  if (!concerns?.length) return null
  return (
    <section className="bg-white border-b border-[var(--color-border)]">
      <div className="container-nezal py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
            Good for:
          </span>
          <div className="flex flex-wrap gap-2">
            {concerns.map((concern) => (
              <Link
                key={concern}
                href={`/concerns/${concern}`}
                className="px-4 py-2 rounded-full border border-[var(--color-brand-primary)]/30 text-[var(--color-brand-primary)] text-sm font-medium bg-[var(--color-brand-primary)]/5 hover:bg-[var(--color-brand-primary)]/10 transition-colors"
              >
                {toLabel(concern)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function RitualStrip({ steps }: { steps: RitualStep[] }) {
  if (!steps?.length) return null
  return (
    <section id="ritual" className="bg-[var(--color-bg-cream)]">
      <div className="container-nezal py-14">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              How to Use
            </h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Build your complete skincare ritual
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, idx) => (
              <div key={step.step} className="relative flex flex-col gap-4">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%-1rem)] w-8 h-px bg-[var(--color-border)] z-0" />
                )}

                <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white border border-[var(--color-border)] hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[var(--color-brand-primary)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {step.step}
                    </span>
                    <span className="font-bold text-[var(--color-text-heading)]">
                      {step.label}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {step.description}
                  </p>
                  {step.linkedCollectionSlug && (
                    <Link
                      href={`/collections/${step.linkedCollectionSlug}`}
                      className="mt-auto self-start text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                    >
                      Shop {toLabel(step.linkedCollectionSlug)} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function VariantGrid({ products }: { products: Product[] }) {
  if (!products?.length) return null
  return (
    <section id="variants" className="bg-white">
      <div className="container-nezal py-14">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              Shop the Collection
            </h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Find the variant that matches your skin story
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="flex flex-col gap-2">
                {/* Variant label above card */}
                {product.variantLabel && (
                  <div className="flex flex-col gap-1 px-1">
                    <span className="text-xs font-semibold text-[var(--color-brand-primary)] uppercase tracking-wider">
                      {product.variantLabel}
                    </span>
                    {product.skinTypes && product.skinTypes.length > 0 && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        For {product.skinTypes.slice(0, 2).map(toLabel).join(", ")} skin
                      </span>
                    )}
                  </div>
                )}
                <ProductCard
                  id={product._id}
                  name={product.name}
                  price={product.price}
                  discountPrice={product.discountPrice}
                  image={product.image}
                  company={product.company}
                  hasMultipleSizes={!!product.sizes?.length}
                  sizes={product.sizes as any}
                  stock={product.stock}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  const items = [
    { icon: <Leaf size={22} />, label: "Herbal Formulated",     sub: "100% botanical ingredients"     },
    { icon: <ShieldCheck size={22} />, label: "No Harsh Chemicals", sub: "Paraben & sulphate free"     },
    { icon: <FlaskConical size={22} />, label: "Dermatologist Tested", sub: "Safe for all skin types" },
    { icon: <Star size={22} />, label: "Made in India",          sub: "Crafted with Ayurvedic wisdom"  },
  ]
  return (
    <section className="bg-[var(--color-brand-primary)]">
      <div className="container-nezal py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-center text-white">
              <span className="opacity-80">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
              <span className="text-xs opacity-70">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CompleteRitual({ collections }: { collections: RelatedCollection[] }) {
  if (!collections?.length) return null
  return (
    <section className="bg-[var(--color-bg-cream)]">
      <div className="container-nezal py-14">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              Complete Your Ritual
            </h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Pair with these collections for the full Nezal experience
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {collections.map((col) => (
              <Link
                key={col._id}
                href={`/collections/${col.slug}`}
                className="group flex flex-col gap-4 p-6 rounded-2xl bg-white border border-[var(--color-border)] hover:shadow-md hover:border-[var(--color-brand-primary)]/30 transition-all"
              >
                {/* Image placeholder */}
                <div className="aspect-video rounded-xl overflow-hidden bg-[var(--color-bg-cream)] relative">
                  {col.heroImage ? (
                    <Image src={col.heroImage} alt={col.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Leaf size={32} className="text-[var(--color-brand-primary)]/30" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--color-brand-primary)] uppercase tracking-wider">
                    {NAV_CATEGORY_LABELS[col.navCategory] ?? toLabel(col.navCategory)}
                  </span>
                  <h3 className="font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                    {col.name}
                  </h3>
                  {col.tagline && (
                    <p className="text-sm text-[var(--color-text-muted)]">{col.tagline}</p>
                  )}
                </div>

                <span className="text-sm font-semibold text-[var(--color-brand-primary)] group-hover:underline mt-auto">
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQSection({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  if (!faqs?.length) return null

  return (
    <section className="bg-white border-t border-[var(--color-border)]">
      <div className="container-nezal py-14">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  className="w-full flex items-center justify-between gap-4 text-left"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                  <span className="font-semibold text-[var(--color-text-heading)] text-sm md:text-base">
                    {faq.question}
                  </span>
                  {openIndex === idx ? (
                    <ChevronUp size={18} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  )}
                </button>

                {openIndex === idx && (
                  <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CollectionSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] animate-pulse">
      <div className="bg-[var(--color-bg-cream)] h-96" />
      <div className="container-nezal py-14 flex flex-col gap-6">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="h-4 w-full bg-neutral-100 rounded" />
        <div className="h-4 w-3/4 bg-neutral-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const params = useParams()
  const slug = params.slug as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [relatedCollections, setRelatedCollections] = useState<RelatedCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/collections/${slug}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error("Failed to fetch collection")

        const data = await res.json()
        setCollection(data.collection)
        setProducts(data.products ?? [])
        setRelatedCollections(data.relatedCollections ?? [])
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  if (loading) return <CollectionSkeleton />

  if (notFound || !collection) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-page)]">
        <h1 className="text-2xl font-bold text-[var(--color-text-heading)]">
          Collection not found
        </h1>
        <Link
          href="/collections"
          className="text-[var(--color-brand-primary)] hover:underline font-medium"
        >
          Browse all collections →
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">
      <CollectionHero collection={collection} />
      {/* <CollectionStory collection={collection} /> */}
      {/* <IngredientGrid ingredients={collection.keyIngredients} /> */}
      {/* <ConcernPills concerns={collection.concerns} /> */}
      {/* <RitualStrip steps={collection.ritualSteps} /> */}
      <VariantGrid products={products} />
      <TrustStrip />
      <CompleteRitual collections={relatedCollections} />
      <FAQSection faqs={collection.faq} />
    </main>
  )
}