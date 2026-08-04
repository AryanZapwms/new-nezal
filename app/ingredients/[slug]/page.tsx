"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronRight, Leaf, Home, CheckCircle2, Sparkles, FlaskConical } from "lucide-react"
import ProductCard from "@/components/product-card"
import Image from "next/image"

/* ─── Types ──────────────────────────────────────────────── */

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
  isBestSeller?: boolean
  sizes?: { size: string; unit: string; quantity: number; price: number; discountPrice?: number; stock: number }[]
  stock?: number
  company: { name: string; slug: string }
}

interface IngredientInfo {
  label: string
  tagline: string
  description: string
  category: string
  emoji: string
  benefits: string[]
  helpsAddress: string[]
  didYouKnow: string
}

/* ─── Ingredient Data ────────────────────────────────────── */

const INGREDIENT_DATA: Record<string, IngredientInfo> = {
  "aloe-vera": {
    label: "Aloe Vera",
    emoji: "🌿",
    category: "Skin Active",
    tagline: "Nature's Universal Skin & Hair Soother",
    description: "Aloe Vera is the most widely used botanical active in the Nezal range — present in over 65 formulations. Rich in vitamins, minerals, amino acids, and antioxidants, it soothes, hydrates, and conditions across all skin and hair types. The science behind its effectiveness is well-established: Acemannan, its key polysaccharide, supports skin cell renewal and moisture retention at once.",
    benefits: [
      "Soothes dry, irritated, and sensitive skin",
      "Supports skin hydration and moisture balance",
      "Calms redness and post-sun discomfort",
      "Conditions and softens hair and scalp",
      "Promotes comfortable, healthy-looking skin",
    ],
    helpsAddress: ["Dry skin", "Sensitive skin", "Post-wash skin tightness", "Scalp dryness", "Everyday skin and hair care"],
    didYouKnow: "Aloe Vera gel is 99% water — yet that remaining 1% contains over 200 biologically active compounds including vitamins, minerals, enzymes, and polysaccharides.",
  },
  "niacinamide": {
    label: "Niacinamide",
    emoji: "✨",
    category: "Skin Active",
    tagline: "The Multi-Tasking Skin Expert",
    description: "Niacinamide is one of the most clinically researched skincare actives available. Unlike single-function ingredients, it works at a cellular level on multiple fronts simultaneously: strengthening the skin barrier, reducing pore appearance, evening skin tone, and supporting radiance — making it a cornerstone of Nezal's targeted face serum range.",
    benefits: [
      "Supports brighter and more even-looking skin tone",
      "Minimises the visible appearance of pores",
      "Strengthens the skin's natural barrier function",
      "Reduces post-inflammatory redness",
      "Rebuilds healthy skin cells and retains moisture",
    ],
    helpsAddress: ["Pigmentation", "Dull skin", "Enlarged pores", "Acne marks", "Compromised skin barrier"],
    didYouKnow: "Niacinamide is water-soluble, which means it absorbs quickly without residue — and it is stable in formulations across a wide pH range, making it one of the most reliable actives in skincare science.",
  },
  "vitamin-c": {
    label: "Vitamin C",
    emoji: "🍊",
    category: "Skin Active",
    tagline: "Radiance, Brightness & Antioxidant Protection",
    description: "Vitamin C (Ascorbic Acid) is one of the most potent antioxidant actives used in skincare — and one of the few that directly stimulates collagen synthesis in the skin. In Nezal formulations it appears as a brightening serum active and in the Foaming Face Wash, where it works with Aloe Vera to cleanse and brighten in the same step.",
    benefits: [
      "Promotes collagen production for firmer skin",
      "Supports skin brightness and a healthy glow",
      "Helps fade dark spots and hyperpigmentation",
      "Antioxidant protection against environmental stressors",
      "Brightens complexion with consistent daily use",
    ],
    helpsAddress: ["Pigmentation", "Dark spots", "Dull skin", "Uneven complexion", "Early signs of ageing"],
    didYouKnow: "Vitamin C works as an antioxidant by donating an electron to neutralise free radicals — protecting the skin without becoming harmful itself in the process.",
  },
  "hyaluronic-acid": {
    label: "Hyaluronic Acid",
    emoji: "💧",
    category: "Skin Active",
    tagline: "Deep Hydration Specialist",
    description: "Hyaluronic Acid is found naturally in the skin — but production declines with age. Topically applied, it draws water from the environment and deeper skin layers to the surface, creating a sustained plumping and moisturising effect. In Nezal's serums it works at multiple molecular weights to hydrate both the surface and deeper skin layers.",
    benefits: [
      "Draws and retains moisture deep within the skin",
      "Creates a visibly plumper, smoother skin surface",
      "Supports the skin's natural moisture barrier",
      "Lightweight — absorbs without greasiness",
      "Suitable for all skin types",
    ],
    helpsAddress: ["Dry skin", "Dehydration", "Fine lines from dryness", "Mature skin", "Loss of skin plumpness"],
    didYouKnow: "A single gram of Hyaluronic Acid can hold up to 6 litres of water — making it the most efficient moisture-binding molecule known in cosmetic science.",
  },
  "salicylic-acid": {
    label: "Salicylic Acid",
    emoji: "🧪",
    category: "Skin Active",
    tagline: "Pore-Clearing Acne & Oil Control Active",
    description: "Salicylic Acid is a beta-hydroxy acid (BHA) — and its oil-solubility is what makes it uniquely effective for oily and acne-prone skin. Unlike water-soluble acids that work on the skin surface, BHAs penetrate the pore lining itself to dissolve the sebum and dead cells causing congestion from within — addressing acne at its source.",
    benefits: [
      "Penetrates pores to dissolve excess oil from within",
      "Helps reduce acne and breakouts with regular use",
      "Minimises visible pore size",
      "Gently exfoliates to prevent dead-skin buildup",
      "Controls sebum without over-drying skin",
    ],
    helpsAddress: ["Acne", "Oily skin", "Clogged pores", "Blackheads", "Combination skin"],
    didYouKnow: "Salicylic Acid was originally derived from the bark of the willow tree — it is the same compound that inspired the development of Aspirin in 1897.",
  },
  "tea-tree": {
    label: "Tea Tree",
    emoji: "🌿",
    category: "Botanical Active",
    tagline: "Clarity, Purification & Acne Control",
    description: "Tea Tree Essential Oil is one of the most extensively studied botanical actives for oily and blemish-prone skin. Its primary active compounds — Terpinen-4-ol — disrupt the cell membranes of acne-causing bacteria, making it a genuinely effective natural antibacterial without the resistance concerns associated with synthetic alternatives.",
    benefits: [
      "Natural antiseptic that targets acne-causing bacteria",
      "Controls excess sebum production",
      "Purifies pores with gentle daily use",
      "Effective in both face care and intimate hygiene",
      "Reduces blemishes without harsh bleaching",
    ],
    helpsAddress: ["Acne", "Oily skin", "Blemishes", "Clogged pores", "Intimate hygiene care"],
    didYouKnow: "In a controlled study, Tea Tree oil at 5% concentration was found to be as effective as benzoyl peroxide at 5% for treating acne — with fewer side effects and less dryness.",
  },
  "neem": {
    label: "Neem",
    emoji: "🌿",
    category: "Botanical Active",
    tagline: "Ayurvedic Antibacterial & Purifying Care",
    description: "Neem has been central to Ayurvedic skin and hair care for over 4,000 years — and modern science has validated what traditional wisdom always knew. Nimbin and Azadirachtin, its primary bioactive compounds, deliver antibacterial, antifungal, and anti-inflammatory care that makes it one of the most versatile purifying botanicals in the Nezal range.",
    benefits: [
      "Natural antibacterial targets acne-causing bacteria",
      "Antifungal care supports scalp health",
      "Anti-inflammatory calms redness and irritation",
      "Purifies pores and removes environmental impurities",
      "Gentle enough for daily use across skin types",
    ],
    helpsAddress: ["Acne", "Oily skin", "Dandruff", "Scalp congestion", "Daily skin purification"],
    didYouKnow: "Neem is called 'Sarva Roga Nivarini' in Sanskrit — meaning 'the cure of all ailments' — a reflection of the breadth of its documented traditional applications.",
  },
  "tulsi": {
    label: "Tulsi",
    emoji: "🌱",
    category: "Botanical Active",
    tagline: "Sacred Herbal Disinfectant & Skin Balancer",
    description: "Tulsi — the Queen of Herbs in Ayurvedic tradition — contains Eugenol, Rosmarinic Acid, and Ursolic Acid: compounds with proven antibacterial, anti-inflammatory, and adaptogenic properties. In Nezal formulations it pairs with Neem for comprehensive purifying care, and is the primary antibacterial active in all four of our Herbal Hand Washes.",
    benefits: [
      "Natural disinfecting properties for daily skin protection",
      "Balances excess oil and maintains fresh complexion",
      "Supports scalp health alongside Neem",
      "Primary antibacterial in our hand care range",
      "Gentle enough for daily use all skin types",
    ],
    helpsAddress: ["Oily acne-prone skin", "Scalp buildup", "Excess sebum", "Hand hygiene", "Daily skin balance"],
    didYouKnow: "Tulsi is classified as an 'adaptogen' — a class of botanicals that help the body and skin adapt to stress, rebalancing what is out of balance rather than forcing a single outcome.",
  },
  "turmeric": {
    label: "Turmeric",
    emoji: "🌟",
    category: "Botanical Active",
    tagline: "Golden Brightening & Anti-Inflammatory Care",
    description: "Turmeric's primary active compound — Curcumin — has more published research than almost any other botanical in skincare. It inhibits the enzymes responsible for melanin production, calms skin inflammation, and provides antioxidant protection. Used carefully in formulation, Nezal delivers these benefits without the yellow staining that raw turmeric imparts.",
    benefits: [
      "Inhibits melanin production for a more even tone",
      "Powerful anti-inflammatory calms reactive skin",
      "Antioxidant protection against skin stressors",
      "Traditional Indian brightening with modern formulation",
      "Supports glow and radiance with consistent use",
    ],
    helpsAddress: ["Pigmentation", "Inflammation", "Dull skin", "Uneven tone", "Everyday glow"],
    didYouKnow: "Curcumin gives turmeric its distinctive golden colour — and the same pigment molecules that colour it are the ones responsible for its skin-brightening and anti-inflammatory benefits.",
  },
  "saffron": {
    label: "Saffron",
    emoji: "🌸",
    category: "Botanical Active",
    tagline: "Timeless Brightening Ingredient",
    description: "Saffron — Crocus sativus — was once more expensive than gold by weight, and it remains one of the most tresured ingredients in skincare. Safranal and Crocin, its primary bioactive compounds, deliver antioxidant and brightening benefits that support skin luminosity. Nezal uses it carefully in advanced formulations where its concentration delivers visible radiance support.",
    benefits: [
      "Supports skin radiance and a luminous healthy glow",
      "Helps improve complexion and reduce dullness",
      "Heritage botanical ingredient with antioxidant properties",
      "Pairs with Sandalwood and Turmeric for full brightening",
      "Elevates the sensory experience of every use",
    ],
    helpsAddress: ["Dull lacklustre skin", "Uneven tone", "Glow enhancement", "Elevated skincare experience"],
    didYouKnow: "It takes approximately 75,000 saffron flowers and 200 hours of hand-picking to produce just one pound of saffron — a testament to its rearity and enduring value in skin care.",
  },
  "redensyl": {
    label: "Redensyl",
    emoji: "🔬",
    category: "Hair Active",
    tagline: "Advanced Hair Density & Growth Active",
    description: "Redensyl is a patented compound developed through hair biology research — it specifically targets Outer Root Sheath (ORS) stem cells in the hair follicle, reactivating them from the resting phase back into active growth. It has been validated in clinical studies and is one of the most scientifically credible hair actives available outside prescription treatment.",
    benefits: [
      "Reactivates dormant hair follicle stem cells",
      "Helps reduce visible hair fall with consistent use",
      "Improves hair density appearance over 3–6 months",
      "Supports a healthier scalp environment",
      "Works synergistically with Anagain for enhanced results",
    ],
    helpsAddress: ["Hair fall", "Hair thinning", "Weak roots", "Hair density loss", "Post-stress hair loss"],
    didYouKnow: "Redensyl was developed as a result of research into organ transplants — scientists studying how stem cells could be reactivated for tissue regeneration applied that science directly to hair follicle biology.",
  },
  "anagain": {
    label: "Anagain",
    emoji: "🌱",
    category: "Hair Active",
    tagline: "Natural Hair Cycle Support",
    description: "Anagain is derived from organic pea sprouts (Pisum sativum) and works by up-regulating the signalling molecules that stimulate hair follicles during the anagen (growth) phase. Unlike topical treatments that work from outside the follicle, Anagain works within the follicle biology itself — making it one of the most precisely targeted natural hair actives.",
    benefits: [
      "Signals follicles to re-enter active growth phase",
      "Certified organic botanical — no synthetic compounds",
      "Complements Redensyl for dual-action hair wellness",
      "Improves the ratio of growing to resting follicles",
      "Visible results typically seen from 90 days of consistent use",
    ],
    helpsAddress: ["Hair fall", "Thinning hair", "Slow hair growth", "Hair wellness"],
    didYouKnow: "Anagain was clinically tested in a study showing it increased the ratio of anagen (growing) to telogen (resting) hair follicles by 78% compared to placebo after 3 months of use.",
  },
  "amla": {
    label: "Amla",
    emoji: "🫐",
    category: "Hair Active",
    tagline: "Ayurvedic Hair Strength & Shine",
    description: "Amla (Phyllanthus emblica) is one of the richest natural sources of Vitamin C on earth — approximately 20 times more than an orange by weight. In Ayurvedic hair care, it has been trusted for centuries to strengthen roots, prevent greying, and enhance natural shine. Modern extraction makes these benefits available in every wash.",
    benefits: [
      "One of nature's richest sources of Vitamin C",
      "Strengthens hair from the roots visibly",
      "Improves scalp blood circulation",
      "Enhances natural hair shine and smoothness",
      "Reduces hair breakage and thinning",
    ],
    helpsAddress: ["Hair fall", "Weak brittle hair", "Dull hair", "Scalp health"],
    didYouKnow: "Amla is one of the three fruits in Triphala — one of Ayurveda's most celebrated formulations — and has more Vitamin C by weight than almost any food or plant found in nature.",
  },
  "shikakai": {
    label: "Shikakai",
    emoji: "🌿",
    category: "Hair Active",
    tagline: "Traditional Herbal Hair Cleanser & Conditioner",
    description: "Shikakai (Acacia concinna) literally means 'fruit for hair' in Sanskrit. Its natural saponins create a gentle lather that cleanses without stripping the scalp's natural oils — a quality that modern SLS-based shampoos consistently fail to match. Regular use leaves the scalp balanced, the hair shaft smooth, and natural shine restored.",
    benefits: [
      "Cleanses scalp without stripping natural oils",
      "Conditions hair naturally alongside cleansing",
      "Reduces dandruff-causing buildup",
      "Promotes naturally soft and manageable hair",
      "Scalp-compatible pH for everyday use",
    ],
    helpsAddress: ["Dry scalp", "Rough hair", "Dandruff", "Loss of natural lustre", "Daily hair care"],
    didYouKnow: "Shikakai's pH is naturally around 4.5 — which happens to match the scalp's own pH perfectly — making it one of the most naturally scalp-compatible cleansing botanicals in existence.",
  },
  "seaweed-extract": {
    label: "Seaweed Extract",
    emoji: "🌊",
    category: "Hair Active",
    tagline: "Mineral-Rich Hair & Skin Nourishment",
    description: "Seaweed Extract contains over 60 trace minerals alongside Omega-3 fatty acids, amino acids, Vitamin B12, and moisture-binding polysaccharides. In hair care, these penetrate the shaft to repair, condition, and restore shine from within — achieving structural hair repair rather than just surface coating.",
    benefits: [
      "60+ trace minerals nourish hair shaft from within",
      "Omega-3 fatty acids restore natural shine",
      "Anti-inflammatory Fucoidan calms scalp irritation",
      "Helps reduce the appearance of cellulite on skin",
      "Promotes healthy-looking, manageable hair",
    ],
    helpsAddress: ["Dry damaged hair", "Frizz", "Scalp care", "Mineral-depleted hair", "Skin detox"],
    didYouKnow: "The mineral profile of seaweed closely mirrors that of human blood plasma — which is why skin and hair absorb its minerals so effectively and visibly.",
  },
  "panthenol": {
    label: "Panthenol",
    emoji: "💊",
    category: "Hair Active",
    tagline: "Deep Hair Moisture & Strength",
    description: "Panthenol is a pro-vitamin that converts to Vitamin B5 inside the hair shaft — meaning it doesn't just coat the surface, it actually integrates into the hair's structure. This makes it one of the most genuinely conditioning actives in hair care: improving elasticity, preventing breakage, and adding lasting moisture from within.",
    benefits: [
      "Penetrates the hair shaft for deep moisture",
      "Improves elasticity — hair bends rather than breaks",
      "Adds lasting softness and manageability",
      "Reduces breakage caused by dryness and mechanical stress",
      "Protects from heat and daily styling damage",
    ],
    helpsAddress: ["Dry brittle hair", "Hair breakage", "Frizz", "Loss of manageability", "Colour-treated hair"],
    didYouKnow: "Panthenol molecules are small enough to penetrate both the cuticle and the cortex of the hair shaft — reaching the inner structure that determines hair strength and elasticity.",
  },
  "kojic-acid": {
    label: "Kojic Acid",
    emoji: "✨",
    category: "Skin Active",
    tagline: "Brightening & Skin Tone Support",
    description: "Kojic Acid is produced naturally by several species of fungi and was first discovered in Japan in 1907. It works by inhibiting Tyrosinase — the enzyme responsible for melanin production — making it one of the most targeted natural brightening actives available. In Nezal formulations it amplifies the brightening effect of Vitamin C and Niacinamide working together.",
    benefits: [
      "Inhibits melanin production at the enzyme level",
      "Helps reduce dark spots and hyperpigmentation",
      "Works synergistically with Vitamin C for enhanced brightening",
      "Addresses both face and body pigmentation",
      "Supports radiant, more even complexion",
    ],
    helpsAddress: ["Dark spots", "Pigmentation", "Uneven tone", "Post-acne marks", "Body brightening"],
    didYouKnow: "Kojic Acid is a by-product of the fermentation process used to produce sake (Japanese rice wine) — its brightening properties were discovered when sake brewers noticed unusually smooth, bright skin on their hands.",
  },
  "glycerine": {
    label: "Glycerine",
    emoji: "💧",
    category: "Skin Active",
    tagline: "Universal Moisture Retention & Skin Comfort",
    description: "Glycerine is a naturally derived humectant that forms the moisture foundation of 46 Nezal formulations — including the entire Bathing Bar and soap range. Its mechanism is simple and powerful: it draws water molecules from the environment and deeper skin layers to the surface, ensuring skin never feels stripped, tight, or uncomfortable after cleansing.",
    benefits: [
      "Draws atmospheric moisture into the skin",
      "Prevents the stripped, tight feeling after cleansing",
      "Conditions and softens skin with every wash",
      "Works in all temperatures and humidity levels",
      "Safe for all skin types including very sensitive",
    ],
    helpsAddress: ["Post-wash dryness", "Sensitive skin", "Daily moisture maintenance", "Cleansing comfort", "All skin types"],
    didYouKnow: "Glycerine was accidentally discovered in 1779 when a chemist heated a mixture of olive oil and lead monoxide — making one of skincare's most important ingredients the product of an accidental experiment.",
  },
  "shea-butter": {
    label: "Shea Butter",
    emoji: "🧈",
    category: "Emollient",
    tagline: "Deep Nourishment, Softness & Barrier Repair",
    description: "Shea Butter is extracted from the Butyrospermum parkii tree nut and has been used in African skincare for centuries. Its combination of essential fatty acids (oleic, stearic, linoleic) and Vitamins A and E makes it one of the most complete natural emollients available — simultaneously conditioning, nourishing, and repairing the skin barrier.",
    benefits: [
      "Deeply conditions and softens even the driest skin",
      "Repairs the skin's natural moisture barrier",
      "Rich in Vitamins A and E for nourishing care",
      "Non-comedogenic — nourishes without clogging pores",
      "Long-lasting moisture for body and face",
    ],
    helpsAddress: ["Dry rough skin", "Cracked skin", "Barrier damage", "Winter dryness", "Body nourishment"],
    didYouKnow: "Shea Butter is technically classified as a 'non-saponifiable' fat — meaning it cannot be turned into soap — which is exactly what makes it such an effective skin conditioning ingredient.",
  },
  "activated-charcoal": {
    label: "Activated Charcoal",
    emoji: "⬛",
    category: "Botanical Active",
    tagline: "Deep Pore Detox & Purification",
    description: "Activated Charcoal is created by heating carbon-rich materials (wood, bamboo, coconut shells) to extreme temperatures without oxygen — creating a highly porous structure with an enormous surface area. Each tiny particle acts as a molecular magnet, physically attracting and trapping impurities, toxins, and excess oil before they are rinsed away.",
    benefits: [
      "Draws out pore impurities with a physical magnet action",
      "Deep-cleanses without harsh chemical stripping",
      "Reduces blackhead appearance with regular use",
      "Leaves skin feeling genuinely deeply clean",
      "Balances oily skin without causing dryness",
    ],
    helpsAddress: ["Clogged pores", "Oily skin", "Blackheads", "Environmental toxin buildup", "Deep detox cleansing"],
    didYouKnow: "Activated Charcoal has a surface area of up to 2,000 square metres per gram — that's roughly half an acre of surface in a quantity smaller than a teaspoon.",
  },
  "himalayan-pink-salt": {
    label: "Himalayan Pink Salt",
    emoji: "🏔️",
    category: "Wellness Active",
    tagline: "Mineral-Rich Detox & Wellness Bathing",
    description: "Himalayan Pink Salt is mined from ancient seabed deposits in the Khewra Salt Mine in Pakistan — untouched by modern pollution and containing 84 trace minerals in their natural proportions. In bath care, dissolved salts create an osmotic environment that draws impurities from the skin while replenishing minerals simultaneously — the mechanism behind the 'spa bath' effect.",
    benefits: [
      "84 trace minerals replenish skin and body",
      "Draws impurities from skin through osmotic action",
      "Softens and smooths skin texture visibly",
      "Soothes muscle tension and promotes relaxation",
      "Creates a genuine spa-quality bath experience at home",
    ],
    helpsAddress: ["Muscle tension", "Skin detox", "Stress relief", "Post-workout recovery", "Wellness rituals"],
    didYouKnow: "Himalayan Pink Salt gets its distinctive colour from trace amounts of iron oxide — the same compound responsible for the colour of rust and Mars's red surface.",
  },
  "apple-cider-vinegar": {
    label: "Apple Cider Vinegar",
    emoji: "🍎",
    category: "Skin Active",
    tagline: "Natural Toner, Pore Clarifier & pH Balancer",
    description: "Apple Cider Vinegar (ACV) contains Acetic Acid, Malic Acid, and naturally occurring enzymes that tone the skin, tighten the appearance of pores, and restore the skin's natural pH after cleansing. When paired with Salicylic Acid in Nezal's face wash, it creates a dual-action formula that both clarifies from within and tones from outside.",
    benefits: [
      "Natural toning tightens the appearance of pores",
      "Restores skin pH balance after cleansing",
      "Clarifies oily and combination skin",
      "Works with Salicylic Acid for enhanced pore-clearing",
      "Leaves skin fresh, balanced, and refined",
    ],
    helpsAddress: ["Oily skin", "Enlarged pores", "Acne-prone skin", "pH imbalance", "Daily clarifying care"],
    didYouKnow: "The skin's ideal pH is between 4.5 and 5.5 — many cleansers are more alkaline than this, disrupting the skin barrier. ACV's pH sits around 2–3, which when diluted in formulation, helps bring post-cleanse pH back to the skin's optimal range.",
  },
  "liquorice-extract": {
    label: "Liquorice Extract",
    emoji: "🌿",
    category: "Skin Active",
    tagline: "Natural Skin Brightening & Soothing Care",
    description: "Liquorice Root Extract (Glycyrrhiza glabra) contains Glabridin — one of the most well-studied natural Tyrosinase inhibitors in skincare research. Unlike synthetic brightening agents, Glabridin inhibits melanin production without affecting normal cell function — making it one of the gentlest effective brightening actives available, particularly suited to sensitive skin.",
    benefits: [
      "Naturally inhibits melanin production for even tone",
      "Helps fade dark spots and post-inflammatory marks",
      "Anti-inflammatory — calms redness and irritation",
      "Enhances brightening alongside Vitamin C and Kojic Acid",
      "Suitable for sensitive skin types",
    ],
    helpsAddress: ["Pigmentation", "Uneven skin tone", "Post-acne marks", "Sensitive skin brightening", "Redness"],
    didYouKnow: "Liquorice has been used in Chinese and Ayurvedic medicine for over 4,000 years — its skin brightening properties were well-documented in ancient texts long before modern dermatology existed.",
  },
  "papaya-extract": {
    label: "Papaya Extract",
    emoji: "🍈",
    category: "Botanical Active",
    tagline: "Natural Enzyme Brightening & Exfoliation",
    description: "Papaya Extract contains Papain — a proteolytic enzyme that breaks down the protein bonds holding dead skin cells to the surface, dissolving them away without mechanical abrasion. This enzyme-based exfoliation is gentler than physical scrubbing and more targeted than chemical peels — making it an ideal daily brightening approach for most skin types.",
    benefits: [
      "Papain enzyme gently dissolves dead surface cells",
      "Reveals fresher, brighter skin beneath",
      "Works synergistically with Kojic Acid for brightening",
      "Improves skin texture and promotes cellular renewal",
      "Gentler than physical scrubs — suitable for regular use",
    ],
    helpsAddress: ["Dull skin", "Dark spots", "Rough texture", "Pigmentation", "Natural brightening"],
    didYouKnow: "Papain was used in traditional Pacific Island medicine for wound healing — it was eventually adopted into Western medicine and is still used clinically today for debridement of non-healing wounds.",
  },
  "oatmeal": {
    label: "Oatmeal",
    emoji: "🌾",
    category: "Botanical Active",
    tagline: "Gentle Exfoliation & Sensitive Skin Soothing",
    description: "Colloidal Oatmeal (finely milled Avena sativa) is one of only a handful of ingredients formally recognised by the US FDA as an approved skin protectant. Its Avenanthramides — unique antioxidant compounds found only in oats — deliver anti-inflammatory and anti-itch benefits that make it the most evidence-backed soothing ingredient in Nezal's formulations.",
    benefits: [
      "FDA-recognised natural skin protectant",
      "Gentle non-abrasive exfoliation for sensitive skin",
      "Forms a protective moisture barrier on skin surface",
      "Calms itching, irritation, and inflammation",
      "Deeply soothes dry and reactive skin",
    ],
    helpsAddress: ["Sensitive skin", "Dry rough skin", "Skin irritation", "Itching", "Gentle exfoliation"],
    didYouKnow: "Avenanthramides — the active compounds in oatmeal — are unique to oats and are not found in any other plant. They work by blocking the same inflammatory pathways as some medical anti-itch creams.",
  },
  "cedarwood-essential-oil": {
    label: "Cedarwood Essential Oil",
    emoji: "🌲",
    category: "Wellness Active",
    tagline: "Calming Aromatherapy & Deep Skin Nourishment",
    description: "Cedarwood Essential Oil (Cedrus atlantica) is one of the oldest recorded aromatic ingredients in human history — used in Egyptian embalming and spiritual rituals for thousands of years. Its Cedrol and Cedrene compounds interact with the brain's limbic system through olfactory pathways, producing a measurable calming and grounding physiological response that supports relaxation and sleep quality.",
    benefits: [
      "Activates the parasympathetic nervous system for deep relaxation",
      "Woody grounding aroma reduces anxiety and tension",
      "Nourishes skin as a carrier oil base",
      "Non-greasy absorption for a comfortable skin feel",
      "Creates a complete aromatherapy self-care experience",
    ],
    helpsAddress: ["Stress and anxiety", "Sleep support", "Muscle tension", "Evening relaxation", "Spa rituals"],
    didYouKnow: "Cedrol — the primary compound in Cedarwood oil — has been studied for its sedative effects and has been shown in research to reduce activity in the central nervous system, producing genuine relaxation rather than just a perceived one.",
  },
  "multani-mitti": {
    label: "Multani Mitti",
    emoji: "🪨",
    category: "Botanical Active",
    tagline: "Traditional Clay Detox & Oil Control",
    description: "Multani Mitti is a magnesium-rich smectite clay that has been the cornerstone of Indian skin care for centuries. Its unique molecular structure carries a negative electrical charge — which actively attracts the positively charged particles of sebum, bacteria, and environmental toxins in the pores, binding to them and removing them on rinsing.",
    benefits: [
      "Absorbs excess sebum with a physical charge attraction",
      "Draws pore-clogging impurities and toxins out",
      "Tightens the appearance of pores visibly",
      "Mattifies skin and controls shine effectively",
      "Leaves skin feeling genuinely purified and balanced",
    ],
    helpsAddress: ["Oily skin", "Enlarged pores", "Skin congestion", "Excess shine", "Impurity buildup"],
    didYouKnow: "Fuller's Earth gets its English name from its historical use in the wool industry — textile 'fullers' used it to absorb grease and impurities from raw wool fleece before processing.",
  },
  "allantoin": {
    label: "Allantoin",
    emoji: "🌼",
    category: "Skin Active",
    tagline: "Skin-Soothing & Post-Cleanse Comfort",
    description: "Allantoin is a naturally occurring compound originally extracted from the comfrey plant — and is one of the most well-validated wound-healing and skin-soothing actives in cosmetic chemistry. It accelerates the natural cell regeneration process, calms irritation, and maintains skin softness after cleansing — which is why it appears in all three Nezal Shower Gel formulations.",
    benefits: [
      "Soothes and conditions skin immediately post-cleanse",
      "Promotes healthy skin cell regeneration",
      "Calms redness and cleansing-related irritation",
      "Maintains skin softness and comfort between washes",
      "Safe for all skin types including reactive skin",
    ],
    helpsAddress: ["Post-cleanse dryness", "Sensitive skin", "Skin irritation", "Redness", "Daily cleansing comfort"],
    didYouKnow: "Allantoin was one of the first plant-derived compounds identified by science as having measurable wound-healing properties — comfrey plasters containing allantoin were used to treat battlefield injuries centuries before modern medicine.",
  },
  // Kept from original — not in client doc but already live on site
  "rose": {
    label: "Rose",
    emoji: "🌸",
    category: "Botanical Active",
    tagline: "Timeless Floral Hydration & Skin Comfort",
    description: "Rose extract and rose water have been used in beauty rituals for thousands of years across Persia, India, and the Mediterranean. Rich in antioxidants, vitamins, and natural tannins, rose delivers hydration, toning, and a delicate fragrance experience.",
    benefits: [
      "Natural toning properties tighten and refresh the skin",
      "Rich in antioxidants that protect against free radical damage",
      "Hydrates and soothes sensitive and dry skin",
      "Delivers a refreshing natural fragrance experience",
    ],
    helpsAddress: ["Dry and sensitive skin", "Dull complexion", "Skin tightness", "Daily skin toning", "Stress relief through aromatherapy"],
    didYouKnow: "It takes approximately 60,000 roses to produce just 30ml of pure rose essential oil — making it one of the most precious botanical ingredients in skincare.",
  },
  "bhringraj": {
    label: "Bhringraj",
    emoji: "🌱",
    category: "Hair Active",
    tagline: "Ayurvedic King of Hair",
    description: "Bhringraj — literally 'ruler of hair' in Sanskrit — is the most celebrated Ayurvedic herb for hair wellness. Used in traditional Indian hair care for centuries, it supports scalp circulation, strengthens hair roots, and is known to reduce hair fall with regular use.",
    benefits: [
      "Supports scalp blood circulation to nourish hair roots",
      "Traditionally used to reduce hair fall with regular use",
      "Strengthens hair from the root to reduce breakage",
      "Promotes the appearance of thicker, healthier hair",
    ],
    helpsAddress: ["Hair fall", "Weak hair roots", "Scalp health", "Hair thinning", "Premature greying"],
    didYouKnow: "Bhringraj (Eclipta prostrata) has been referenced in Charaka Samhita — one of the foundational texts of Ayurveda — as a rasayana (rejuvenating herb) for hair and brain health.",
  },
}

function toLabel(slug: string) {
  return INGREDIENT_DATA[slug]?.label || slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ─── Skeleton ───────────────────────────────────────────── */

function IngredientSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-64 bg-neutral-100" />
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <div className="h-6 w-48 bg-neutral-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 bg-neutral-100 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function IngredientPage() {
  const params = useParams()
  const slug = params.slug as string

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const info = INGREDIENT_DATA[slug]
  const label = toLabel(slug)

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/ingredients/${slug}`)
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        setProducts(data.products ?? [])
        if ((data.products ?? []).length === 0) setNotFound(true)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) return <IngredientSkeleton />

  return (
    <main className="min-h-screen bg-[var(--color-bg-page)]">

     {/* ── Hero ── */}
<section style={{ backgroundColor: "#F3F5EF" }} className="border-b border-[var(--color-border)]">
  <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
    <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
      <Link href="/" className="hover:text-[var(--color-brand-primary)] flex items-center gap-1">
        <Home size={13} /> Home
      </Link>
      <ChevronRight size={13} />
      <span>Ingredient</span>
      <ChevronRight size={13} />
      <span className="text-[var(--color-text-heading)] font-medium">{label}</span>
    </nav>

      <div>
    <div className="flex flex-col md:flex-row md:items-start gap-8">

      {/* Left — text */}
      <div className="flex flex-col gap-3 flex-1 max-w-2xl">
        <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-sm font-medium">
          <Leaf size={13} /> {info?.category || "Ingredient"}
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-heading)] leading-tight">
          {label}
        </h1>
        {info?.tagline && (
          <p className="text-lg font-medium italic text-[var(--color-brand-primary)]">
            {info.tagline}
          </p>
        )}
        {info?.description && (
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            {info.description}
          </p>
        )}

        {/* Did You Know — shows below text on mobile */}
        {info?.didYouKnow && (
          <div className="md:hidden mt-2 bg-white rounded-2xl border-3 border-[var(--color-border)] p-4 ">
            <div className="flex items-center gap-2 mb-2 ">
              <Sparkles size={15} className="text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Did you know?</p>
            </div>
            <p className="text-sm text-[var(--color-text-body)] leading-relaxed">{info.didYouKnow}</p>
          </div>
        )}
      </div>

      {/* Right — image + did you know */}
      <div className="flex flex-col gap-4 md:w-80 flex-shrink-0 ">

        {/* Ingredient image */}
        <div className="relative w-full h-56 md:h-64 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white">
          <Image
            src={`/ingredients/${slug === "bhringraj" ? "bringraj" : slug}.${
              ["turmeric", "vitamin-c", "tulsi", "shea-butter", "rose", "bringraj"].includes(
                slug === "bhringraj" ? "bringraj" : slug
              ) ? "webp"
              : slug === "tea-tree" ? "png"
              : "jpg"
            }`}
            alt={label}
            fill
            className="object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.jpg"
            }}
          />
          {/* subtle green tint overlay */}
          <div className="absolute inset-0 bg-[#1e3a28]/5" />
        </div>

        
      </div>
  </div>

      {/* Did You Know — desktop */}
          {info?.didYouKnow && (
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--color-border)] p-4 mt-8 ">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-amber-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Did you know?</p>
              </div>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">{info.didYouKnow}</p>
            </div>
          )}
      

    </div>
  </div>
</section>

      {/* ── Benefits + Helps Address ── */}
      {info && (
        <section className="border-b border-[var(--color-border)] bg-white">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Key Benefits */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical size={18} className="text-[var(--color-brand-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-heading)] uppercase tracking-widest">
                    Key Benefits
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {info.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-[var(--color-brand-primary)] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[var(--color-text-body)]">{b}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Helps Address */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf size={18} className="text-[var(--color-brand-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-heading)] uppercase tracking-widest">
                    Helps Address
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {info.helpsAddress.map((h, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border"
                      style={{ backgroundColor: "#f0f7f0", borderColor: "#c8dac9", color: "#1e3a28" }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Products ── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
            Products with {label}
          </h2>
          <span className="text-sm text-[var(--color-text-muted)]">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {notFound || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Leaf size={40} className="text-[var(--color-brand-primary)]/30" />
            <p className="text-[var(--color-text-muted)] text-lg">No products found with this ingredient yet.</p>
            <Link href="/shop" className="text-[var(--color-brand-primary)] font-semibold hover:underline">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product._id}
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
                isBestSeller={product.isBestSeller}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}