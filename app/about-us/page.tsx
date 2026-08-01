// app/about-us/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Leaf,
  FlaskConical,
  BadgeCheck,
  Shield,
  Heart,
  Clock,
  MessageSquare,
  Hotel,
  Sparkles,
  Quote,
  Star,
} from "lucide-react";
import { BRAND } from "@/lib/config";

// ─── Data ────────────────────────────────────────────────────────────────────

const philosophy = [
  {
    icon: FlaskConical,
    title: "Ingredient Integrity",
    description:
      "Carefully selected ingredients. Thoughtfully formulated. No unnecessary complexity. Every formula is built around active botanicals — Aloe Vera, Shea Butter, Saffron, Himalayan Salt, Seaweed — chosen for the role each plays within the formulation, not just to appear on the label.",
  },
  {
    icon: BadgeCheck,
    title: "Manufactured to Earn Trust",
    description:
      "Every batch is produced to exacting standards in our own facility — so consistency, not chance, is what reaches you.",
  },
  {
    icon: Shield,
    title: "Effective Without Harshness",
    description:
      "We formulate for visible results while respecting the skin's natural balance — no products that work by stripping or overcorrecting.",
  },
  {
    icon: Heart,
    title: "Accessible, Not Exclusive",
    description:
      "Exceptional quality shouldn't mean a premium price tag few can justify. Elevated self-care, priced for everyday life.",
  },
];

const commitments = [
  {
    icon: Shield,
    title: "Safety You Don't Have to Question",
    description:
      "Tested for quality, thoughtfully formulated without unnecessary harsh ingredients, never tested on animals. If we wouldn't use it ourselves, it doesn't ship.",
  },
  {
    icon: CheckCircle,
    title: "Honesty on the Label",
    description:
      "What's written on the pack is what's in the bottle — no vague claims, no hidden substitutions, no fine print designed to mislead.",
  },
  {
    icon: Clock,
    title: "Consistency, Order After Order",
    description:
      "The product that delighted you the first time is exactly what arrives the tenth time. Batch after batch, no surprises — the same body lotion, the same bath salts, every single time.",
  },
  {
    icon: MessageSquare,
    title: "Standing Behind What We Sell",
    description:
      "If something isn't right, we make it right — responsive support and straightforward returns, not an inbox that goes quiet.",
  },
];

const trustReasons = [
  {
    icon: Hotel,
    title: "Hospitality Partners Hold Us to a Higher Standard",
    description:
      "Premium hotels and resorts audit consistency, formulation safety, and supply reliability before a single bar of soap reaches a guest room. Nezal has earned and kept that trust — the same standards behind a five-star amenity are behind every bottle you buy for your own home.",
  },
  {
    icon: FlaskConical,
    title: "Transparency Isn't a Marketing Line — It's a Practice",
    description:
      `We name our actives. Redensyl in our hair serum. Niacinamide in our face serum. Kojic Acid in our brightening soaps. When a formula works, we tell you exactly why — not behind vague terms like "active complex" or "proprietary blend."`,
  },
  {
    icon: BadgeCheck,
    title: "Manufactured, Not Merely Marketed",
    description:
      "Every Nezal product is manufactured under our own technical oversight — the same formulation, quality, and production standards applied without exception to every bar of soap, every serum, every bottle that carries the Nezal name.",
  },
  {
    icon: MessageSquare,
    title: "Real Answers When You Need Them",
    description:
      "Skincare questions don't always fit a FAQ page. Whether it's a query about a specific ingredient, a skin concern, or an order, our support team responds with real answers, not scripted ones.",
  },
];

// ── Rating stat removed from here — it's now computed live in the component ──
const baseStats = [
  { value: "5000+", label: "Happy Customers" },
  { value: "12+", label: "Years of R&D" },
  { value: "100%", label: "Quality Assured" },
];

const botanicals = ["Aloe Vera", "Shea Butter", "Saffron", "Seaweed", "Himalayan Salt", "Redensyl", "Niacinamide"];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AboutUs() {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetch("/api/products/reviews/all?limit=500")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.reviews?.length) return;
        const sum = data.reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        setAvgRating(sum / data.reviews.length);
        setReviewCount(data.reviews.length);
      })
      .catch(() => {});
  }, []);

  // ── Build the final stats array, inserting the live rating in position 2 ──
  const stats = [
    baseStats[0],
    {
      value: avgRating !== null ? `${avgRating.toFixed(1)}★` : "—",
      label: reviewCount > 0 ? `Rated by Our Customers` : "Average Rating",
    },
    baseStats[1],
    baseStats[2],
  ];

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#f4f9f4", color: "#1a3a2a" }}>

      {/* ── Our Story ── */}
      <section id="story" className="md:py-10">
        <div className="container mx-auto max-w-6xl px-6 ">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
             
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-8" style={{ color: "#1a3a2a", lineHeight: 1.15 }}>
                The {BRAND.name} Story
              </motion.h2>
              <motion.div variants={stagger} className="space-y-5 text-base leading-relaxed" style={{ color: "#3d5c45" }}>
                <motion.p variants={fadeUp}>
                  {BRAND.name} is a modern skincare, hair care, bath &amp; body care, and wellness brand
                  inspired by natural active ingredients and formulation science, spanning signature handmade soap, advanced
                  face serums, nourishing herbal shampoo and conditioner, body lotion, Aloe Vera gels, bath salts,
                  and wellness essentials — each one designed to turn an ordinary moment into a considered one.
                </motion.p>
                <motion.p variants={fadeUp}>
                  Every formulation is manufactured in technical collaboration with Highbrow Healthcare at our
                  state-of-the-art facility in Navsari, Gujarat, where stringent quality standards, carefully
                  selected ingredients, and modern formulation science come together. Ingredients such as Aloe Vera,
                  Shea Butter, Saffron, Seaweed, Himalayan Salt, Redensyl, and Niacinamide are chosen for their
                  proven role in supporting healthy-looking skin, stronger hair, and lasting wellness — not for how
                  they trend.
                </motion.p>
                <motion.p variants={fadeUp}>
                  What sets {BRAND.name} apart isn't a single ingredient or claim — it's the refusal to choose
                  between them. Effective skincare that feels luxurious. Natural formulations that still deliver
                  results. Exceptional quality, crafted for daily rituals.
                </motion.p>
                <motion.p variants={fadeUp}>
                  Our standards extend beyond retail. {BRAND.name} is also trusted by hospitality partners and
                  premium hotels seeking guest amenities that reflect comfort, care, and refinement.
                </motion.p>
                <motion.div variants={fadeUp} className="flex items-start gap-3 pt-2">

                  <p className="font-medium text-xl" style={{ color: "#1a3a2a" }}>
                    This is {BRAND.name}: thoughtfully crafted skincare inspired by nature, refined by science,
                    and designed for modern living.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div
                className="absolute -top-6 -left-6 w-full h-full rounded-3xl"
                style={{ backgroundColor: "#d4e8d0", zIndex: 0 }}
              />
              <div className="relative z-10 rounded-3xl overflow-hidden aspect-[4/5]">
                <img
                  src="https://res.cloudinary.com/douyptcm1/image/upload/v1783582774/nezal-product-showcase_ebo16u.png"
                  alt={`${BRAND.name} facility`}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(20,50,30,0.55) 0%, transparent 50%)" }}
                />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-sm font-medium text-white/90">
                    Developed with precision, delivered with care
                  </p>
                  <p className="text-xs mt-1 text-white/60">Navsari, Gujarat</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section id="philosophy" className="md:py-10 ">
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mb-16"
          >
           
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-5" style={{ color: "#1a3a2a" }}>
              Our Philosophy
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg max-w-2xl leading-relaxed" style={{ color: "#3d5c45" }}>
              We believe true beauty begins with care. Inspired by nature, guided by expertise, and crafted
              with attention to detail, {BRAND.name} creates thoughtfully creafted skincare and wellness experiences designed
              to nourish the body, uplift the senses, and transform everyday routines into meaningful rituals.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-6"
          >
            {philosophy.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  className="flex gap-5 p-7 rounded-2xl border"
                  style={{ backgroundColor: "#f4f9f4", borderColor: "#d4e8d0" }}
                >
                  <div
                    className="flex-shrink-0 p-2.5 rounded-xl h-fit"
                    style={{ backgroundColor: "#e8f2e4" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#2e6645" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "#1a3a2a" }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#3d5c45" }}>{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center text-xl text-base italic font-medium"
            style={{ color: "#0a4121" }}
          >
            "Luxury-inspired in experience, thoughtfully crafted in substance, <br/>and designed for everyday rituals of care and well-being."
          </motion.p>
        </div>
      </section>

      {/* ── Commitments ── */}
      <section  id="commitment"  className=" md:py-20" style={{ backgroundColor: "#1a3a2a" }}>
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mb-16"
          >
            
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-5" style={{ color: "#f4f9f4" }}>
              Our Commitment
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg max-w-2xl leading-relaxed" style={{ color: "#a8c9a0" }}>
              A philosophy is what we believe. A commitment is what we promise to do about it — whether
              you're buying your first bar of soap or restocking a routine you've trusted us for years.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-5"
          >
            {commitments.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  className="flex gap-5 p-7 rounded-2xl"
                  style={{ backgroundColor: "rgba(240,249,240,0.06)", border: "1px solid rgba(74,124,89,0.25)" }}
                >
                  <div
                    className="flex-shrink-0 p-2.5 rounded-xl h-fit"
                    style={{ backgroundColor: "rgba(74,124,89,0.15)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#4a7c59" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "#f4f9f4" }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#a8c9a0" }}>{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 font-bold  text-xl text-center text-base font-medium"
            style={{ color: "#f8d404" }}
          >
            Because trust isn't a tagline. <br/> It's earned in every box that leaves our facility — and kept by what happens after it arrives.
          </motion.p>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="py-16 border-y" style={{ backgroundColor: "#e8f2e4", borderColor: "#d4e8d0" }}>
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: "#1a3a2a" }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: "#4a6e54" }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why Customers Trust Nezal ── */}
      <section id="trust" className="py-10  md:py-32">
        <div className="container mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mb-16"
          >
         
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-5" style={{ color: "#1a3a2a" }}>
            Why Customers Trust Nezal
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg max-w-2xl leading-relaxed" style={{ color: "#3d5c45" }}>
            Trust is not something a brand can claim into existence - it is built, transaction by transaction, ingredient by ingredient.
            </motion.p>

          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-6"
          >
            {trustReasons.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  className="p-7 rounded-2xl border"
                  style={{ backgroundColor: "#f4f9f4", borderColor: "#d4e8d0" }}
                >
                  <div
                    className="inline-flex p-2.5 rounded-xl mb-4"
                    style={{ backgroundColor: "#e8f2e4" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#2e6645" }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#1a3a2a" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#3d5c45" }}>{item.description}</p>
                </motion.div>
              );
            })}
            
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 font-bold  text-xl text-center text-base font-medium"
            style={{ color: "#19840a" }}
          >
            This is what trust looks like in practice: trusted by hospitality partners who cannot afford compromise, transparent about what goes into every formulation, manufactured under standards we hold ourselves to, and supported by people who stand behind every product we create.
          </motion.p>
        </div>
      </section>

      {/* ── Brand Evolution ── */}
<section id="brand-evolution" className="md:py-16">
  <div className="container mx-auto max-w-5xl px-6">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="text-center mb-12"
    >
      <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-5" style={{ color: "#1a3a2a" }}>
        Our Brand Evolution
      </motion.h2>
      <motion.p variants={fadeUp} className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#3d5c45" }}>
        Every growing brand evolves, and {BRAND.name} is no exception. As part of our journey, we've
        introduced an updated visual identity that reflects who we are today while staying true to the
        values that have always guided us.
      </motion.p>
    </motion.div>

  

    {/* Explanation card */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border p-7 md:p-9 space-y-4"
      style={{ backgroundColor: "#f4f9f4", borderColor: "#d4e8d0" }}
    >
      <p className="text-base leading-relaxed" style={{ color: "#3d5c45" }}>
        Over the coming months, you may notice products carrying either of our two logos. This is part
        of a planned transition as we responsibly use our existing packaging materials rather than
        discarding them unnecessarily.
      </p>
      <p className="text-base leading-relaxed" style={{ color: "#3d5c45" }}>
        Our formulations, manufacturing standards, ingredients, and commitment to quality remain
        exactly the same.
      </p>
      <p className="text-base leading-relaxed" style={{ color: "#3d5c45" }}>
        To us, sustainability isn't only about what's inside the bottle — it also means making
        thoughtful choices about the resources we use.
      </p>
      <p className="text-base font-medium pt-2" style={{ color: "#1a3a2a" }}>
        Thank you for supporting us as {BRAND.name} grows.
      </p>
    </motion.div>

              {/* Logo comparison */}
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-12 mt-4"
    >
      {/* Old logo */}
      <motion.div variants={fadeUp} className="flex flex-col items-center">
        <div
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl flex items-center justify-center p-6 border"
          style={{ backgroundColor: "#fdf6e3", borderColor: "#e8dcb0" }}
        >
          <img src="/oldlogo/old-logo.jpg" alt="Nezal — previous logo" className="w-full h-full object-contain" />
        </div>
        <span
          className="mt-4 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ backgroundColor: "#f4ecd0", color: "#8a6d1f" }}
        >
          Old Logo
        </span>
      </motion.div>

      {/* Arrow / connector */}
      <motion.div variants={fadeUp} className="hidden sm:flex items-center justify-center">
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <path d="M0 12H36M36 12L26 2M36 12L26 22" stroke="#4a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* New logo */}
      <motion.div variants={fadeUp} className="flex flex-col items-center">
        <div
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl flex items-center justify-center p-6 border-2"
          style={{ backgroundColor: "#f4f9f4", borderColor: "#4a7c59" }}
        >
          <img src="/oldlogo/new-logo.jpg" alt="Nezal — current logo" className="w-full h-full object-contain" />
        </div>
        <span
          className="mt-4 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ backgroundColor: "#e8f2e4", color: "#2e6645" }}
        >
          New Logo
        </span>
      </motion.div>
    </motion.div>

    {/* Tagline */}
    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 }}
      className="mt-10 text-center text-xl italic font-medium"
      style={{ color: "#0a4121" }}
    >
      Different logo. Same {BRAND.name}. Same quality. Same promise.
    </motion.p>
  </div>
</section>

      {/* ── CTA ── */}
      <section className="py-10  md:py-28" style={{ backgroundColor: "#e8f2e4" }}>
        <div className="container mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Leaf className="mx-auto h-8 w-8 mb-6" style={{ color: "#5a8a4a" }} />
            <h2 className="text-4xl md:text-5xl font-bold mb-5" style={{ color: "#1a3a2a" }}>
              Ready to Begin<br />Your Ritual?
            </h2>
            <p className="text-lg leading-relaxed mb-10" style={{ color: "#3d5c45" }}>
              Experience thoughtfully crafted skincare, body care & hair care powered by carefully selected natural active ingredients enhanced through science and created for morden living.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="/shop"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#1a3a2a", color: "#f4f9f4" }}
              >
                Shop Now
              </a>
              <a
                href="/contact-us"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-sm border transition-all hover:opacity-80"
                style={{ backgroundColor: "transparent", borderColor: "#1a3a2a", color: "#1a3a2a" }}
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}