/**
 * ============================================================
 *  NEZAL HERBOCARE — MongoDB Seed Script
 *  seed.js
 *  Run: node seed.js
 *  Seeds: users, companies, categories, products,
 *         promos, reviews, orders
 * ============================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ── CONNECTION ──────────────────────────────────────────────
const MONGODB_URI =
  "mongodb://work_db_user:work_db_user@ac-zh4mzfu-shard-00-00.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-01.gdulv8l.mongodb.net:27017,ac-zh4mzfu-shard-00-02.gdulv8l.mongodb.net:27017/nezal-db?ssl=true&replicaSet=atlas-x0imd6-shard-0&authSource=admin&retryWrites=true&w=majority";

// ── SCHEMAS ─────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: String,
    address: { street: String, city: String, state: String, zipCode: String, country: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    resetOtpHash: { type: String },
    resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ──

const carouselImageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, title: String, description: String },
  { _id: true }
);
const newArrivalSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    image: { type: String, required: true },
    description: String,
    position: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);
const shopByConcernSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { _id: true }
);
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    logo: String,
    banner: String,
    email: String,
    phone: String,
    website: String,
    position: { type: Number, default: 0 },
    carouselImages: [carouselImageSchema],
    newArrivals: [newArrivalSchema],
    newArrivalsSettings: { isVisible: { type: Boolean, default: true }, limit: { type: Number, default: 10 } },
    shopByConcern: [shopByConcernSchema],
    shopByConcernSettings: { isVisible: { type: Boolean, default: true }, limit: { type: Number, default: 6 } },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Company = mongoose.models.Company || mongoose.model("Company", companySchema);

// ──

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    image: String,
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
delete mongoose.models.Category;
const Category = mongoose.model("Category", categorySchema);

// ──

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,
    price: { type: Number, required: true },
    discountPrice: Number,
    image: String,
    images: [String],
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    stock: { type: Number, default: 0 },
    sku: String,
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],
    results: [{ image: String, title: String, text: String }],
    sizes: [
      {
        size: String,
        unit: { type: String, enum: ["ml", "l", "g", "kg"], default: "ml" },
        quantity: Number,
        price: Number,
        discountPrice: Number,
        stock: { type: Number, default: 0 },
        sku: String,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

// ──

const promoSchema = new mongoose.Schema(
  {
    title: String,
    message: { type: String, required: true },
    link: { type: String, default: "" },
    linkText: { type: String, default: "" },
    backgroundColor: { type: String, default: "#000000" },
    textColor: { type: String, default: "#ffffff" },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);
delete mongoose.models.Promo;
const Promo = mongoose.model("Promo", promoSchema);

// ──

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    reply: {
      message: String,
      repliedAt: { type: Date, default: Date.now },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      repliedByName: String,
    },
  },
  { timestamps: true }
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

// ──

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        selectedSize: {
          size: String,
          unit: { type: String, enum: ["ml", "l", "g", "kg"] },
          quantity: Number,
          price: Number,
          discountPrice: Number,
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      name: String, phone: String, address: String, street: String,
      city: String, state: String, pincode: String, zipCode: String, country: String,
    },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    paymentMethod: { type: String, enum: ["cod", "razorpay"], default: "razorpay" },
    orderStatus: { type: String, enum: ["pending", "processing", "shipped", "delivered", "cancelled"], default: "pending" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: true }
);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

// ══════════════════════════════════════════════════════════
//  SEED FUNCTION
// ══════════════════════════════════════════════════════════

async function seed() {
  console.log("\n🌱  Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to nezal-db\n");

  // ── CLEAR EXISTING DATA ──────────────────────────────────
  console.log("🗑️   Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Promo.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log("✅  Cleared all collections\n");

  // ────────────────────────────────────────────────────────
  //  1. USERS
  // ────────────────────────────────────────────────────────
  console.log("👤  Seeding users...");
  const hashedAdminPass = await bcrypt.hash("Admin@1234", 10);
  const hashedUserPass  = await bcrypt.hash("User@1234", 10);

  const users = await User.insertMany([
    {
      name: "Nezal Admin",
      email: "admin@nezal.com",
      password: hashedAdminPass,
      phone: "+919821179077",
      role: "admin",
      isVerified: true,
      isActive: true,
      address: { street: "S-55, Whispering Plains", city: "Mumbai", state: "Maharashtra", zipCode: "400101", country: "India" },
    },
    {
      name: "Priya Sharma",
      email: "priya.sharma@gmail.com",
      password: hashedUserPass,
      phone: "+919876543210",
      role: "user",
      isVerified: true,
      isActive: true,
      address: { street: "12, Rose Garden Society", city: "Mumbai", state: "Maharashtra", zipCode: "400054", country: "India" },
    },
    {
      name: "Kajal Verma",
      email: "kajal.verma@gmail.com",
      password: hashedUserPass,
      phone: "+919845001122",
      role: "user",
      isVerified: true,
      isActive: true,
      address: { street: "B-7, Green Park", city: "Delhi", state: "Delhi", zipCode: "110016", country: "India" },
    },
    {
      name: "Bhumika Patel",
      email: "bhumika.patel@gmail.com",
      password: hashedUserPass,
      phone: "+919912345678",
      role: "user",
      isVerified: true,
      isActive: true,
      address: { street: "Flat 3A, Sunshine Apartments", city: "Ahmedabad", state: "Gujarat", zipCode: "380015", country: "India" },
    },
    {
      name: "Rajani Singh",
      email: "rajani.singh@gmail.com",
      password: hashedUserPass,
      phone: "+919798765432",
      role: "user",
      isVerified: true,
      isActive: true,
      address: { street: "C-22, Laxmi Nagar", city: "Pune", state: "Maharashtra", zipCode: "411001", country: "India" },
    },
    {
      name: "Sneha Reddy",
      email: "sneha.reddy@gmail.com",
      password: hashedUserPass,
      phone: "+919700234567",
      role: "user",
      isVerified: false,
      isActive: true,
      address: { street: "45, Jubilee Hills", city: "Hyderabad", state: "Telangana", zipCode: "500033", country: "India" },
    },
  ]);
  console.log(`   ✓ ${users.length} users created`);
  const adminUser = users[0];

  // ────────────────────────────────────────────────────────
  //  2. COMPANY
  // ────────────────────────────────────────────────────────
  console.log("🏢  Seeding company...");

  // We'll add newArrivals + shopByConcern after products are created
  const company = await Company.create({
    name: "Nezal Herbocare",
    slug: "nezal-herbocare",
    description:
      "Nezal Herbocare is a cosmetics venture of Healthcare Medical Centre, a large import and export house based in Mumbai, India. We provide 100% natural, handmade, organic skin care products adhering to USFDA guidelines.",
    logo: "/companylogo.jpg",
    banner: "/carousel/banner1.jpg",
    email: "info@nezalherbocare.com",
    phone: "+918122629655",
    website: "https://nezalherbocare.com",
    position: 1,
    carouselImages: [
      {
        url: "/carousel/banner1.jpg",
        title: "Nature's Care, Visible Everywhere",
        description: "Herbal goodness that nourishes, refreshes and brings out your natural glow.",
      },
      {
        url: "/carousel/banner2.jpg",
        title: "Nature's Goodness For Your Skin",
        description: "Herbal skincare that nourishes, protects & brings out your natural glow.",
      },
      {
        url: "/carousel/banner3.jpg",
        title: "Nature's Intelligence Visible.",
        description: "Botanical formulations crafted from ancient Ayurvedic wisdom.",
      },
    ],
    newArrivalsSettings: { isVisible: true, limit: 8 },
    shopByConcernSettings: { isVisible: true, limit: 6 },
    isActive: true,
  });
  console.log(`   ✓ Company "${company.name}" created`);

  // ────────────────────────────────────────────────────────
  //  3. CATEGORIES
  // ────────────────────────────────────────────────────────
  console.log("📂  Seeding categories...");

  const categoryData = [
    { name: "Face Care",        slug: "face-care",        description: "Complete range of face care products for glowing skin",    image: "/categories/face-care.jpg"        },
    { name: "Body Care",        slug: "body-care",        description: "Nourishing body care products for soft, healthy skin",     image: "/categories/body-care.jpg"        },
    { name: "Hair Care",        slug: "hair-care",        description: "Natural hair care solutions for strong, shiny hair",       image: "/categories/hair-care.jpg"        },
    { name: "Bath & Shower",    slug: "bath-shower",      description: "Cleanse with nature's touch",                             image: "/categories/bath-shower.jpg"      },
    { name: "Massage Oil",      slug: "massage-oil",      description: "Sustainably sourced planet-friendly massage oils",        image: "/categories/massage-oil.jpg"      },
    { name: "Intimate Hygiene", slug: "intimate-hygiene", description: "Gentle intimate hygiene products",                        image: "/categories/intimate-hygiene.jpg" },
    { name: "Soaps",            slug: "soaps",            description: "Handcrafted natural soaps with botanical ingredients",    image: "/categories/soaps.jpg"            },
    { name: "Gift Kits",        slug: "gift-kits",        description: "Beautifully curated gift sets for your loved ones",       image: "/categories/gift-kits.jpg"        },
  ];

  const categories = await Category.insertMany(
    categoryData.map((c) => ({ ...c, company: company._id, isActive: true }))
  );
  console.log(`   ✓ ${categories.length} categories created`);

  // Helper: find category by slug
  const cat = (slug) => categories.find((c) => c.slug === slug)._id;

  // ────────────────────────────────────────────────────────
  //  4. PRODUCTS
  // ────────────────────────────────────────────────────────
  console.log("📦  Seeding products...");

  const productsData = [
    // ── FACE CARE ────────────────────────────────────────
    {
      name: "Ubtan D-Tan Face Wash",
      slug: "ubtan-d-tan-face-wash",
      description:
        "A powerful de-tanning face wash enriched with turmeric and sandalwood that removes tan, brightens skin tone and leaves your skin glowing naturally.",
      price: 299,
      discountPrice: 249,
      image: "/products/ubtan-dtan-facewash.jpg",
      images: ["/products/ubtan-dtan-facewash.jpg", "/products/ubtan-dtan-facewash-2.jpg"],
      category: cat("face-care"),
      stock: 120,
      sku: "NZ-FC-001",
      ingredients: ["Turmeric Extract", "Sandalwood Powder", "Aloe Vera", "Vitamin C", "Niacinamide"],
      benefits: ["Removes tan", "Brightens skin", "Evens skin tone", "Deep cleansing"],
      usage: "Apply on wet face, massage gently in circular motions for 1-2 minutes, rinse with water. Use twice daily.",
      suitableFor: ["All skin types", "Tanned skin", "Dull skin"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 299, discountPrice: 249, stock: 80, sku: "NZ-FC-001-100" },
        { size: "200ml", unit: "ml", quantity: 200, price: 499, discountPrice: 420, stock: 40, sku: "NZ-FC-001-200" },
      ],
    },
    {
      name: "Neem Tulsi Face Wash",
      slug: "neem-tulsi-face-wash",
      description:
        "An antibacterial face wash combining the power of Neem and Tulsi to fight acne, pimples and bacteria, leaving your skin clean and refreshed.",
      price: 249,
      discountPrice: 199,
      image: "/products/neem-tulsi-facewash.jpg",
      images: ["/products/neem-tulsi-facewash.jpg"],
      category: cat("face-care"),
      stock: 95,
      sku: "NZ-FC-002",
      ingredients: ["Neem Extract", "Tulsi (Holy Basil)", "Tea Tree Oil", "Aloe Vera Gel", "Zinc"],
      benefits: ["Fights acne", "Antibacterial", "Controls oil", "Reduces pimples"],
      usage: "Wet face, apply and lather, massage for 1 minute, rinse thoroughly. Use morning and night.",
      suitableFor: ["Oily skin", "Acne-prone skin", "Combination skin"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 249, discountPrice: 199, stock: 60, sku: "NZ-FC-002-100" },
        { size: "200ml", unit: "ml", quantity: 200, price: 429, discountPrice: 369, stock: 35, sku: "NZ-FC-002-200" },
      ],
    },
    {
      name: "Almond Nourishing Cream",
      slug: "almond-nourishing-cream",
      description:
        "A deeply nourishing cream with sweet almond oil and shea butter that moisturises, softens and gives your skin a radiant healthy glow.",
      price: 399,
      discountPrice: 329,
      image: "/products/almond-nourishing-cream.jpg",
      images: ["/products/almond-nourishing-cream.jpg"],
      category: cat("face-care"),
      stock: 75,
      sku: "NZ-FC-003",
      ingredients: ["Sweet Almond Oil", "Shea Butter", "Vitamin E", "Rose Water", "Glycerin"],
      benefits: ["Deep moisturisation", "Softens skin", "Natural glow", "Anti-aging"],
      usage: "Apply a small amount on clean face and neck. Massage gently until absorbed. Use daily morning and night.",
      suitableFor: ["Dry skin", "Normal skin", "Mature skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 399, discountPrice: 329, stock: 50, sku: "NZ-FC-003-100" },
        { size: "200g", unit: "g", quantity: 200, price: 699, discountPrice: 579, stock: 25, sku: "NZ-FC-003-200" },
      ],
    },
    {
      name: "Avocado Honey Face Wash",
      slug: "avocado-honey-face-wash",
      description:
        "A gentle moisturising face wash with avocado and honey extracts that cleanses while keeping skin soft, supple and hydrated.",
      price: 279,
      discountPrice: 229,
      image: "/products/avocado-honey-facewash.jpg",
      images: ["/products/avocado-honey-facewash.jpg"],
      category: cat("face-care"),
      stock: 60,
      sku: "NZ-FC-004",
      ingredients: ["Avocado Extract", "Honey", "Milk Protein", "Vitamin B5", "Chamomile"],
      benefits: ["Gentle cleansing", "Maintains moisture", "Soothing", "Soft skin"],
      usage: "Apply on wet face, gently massage and rinse. Safe for daily use.",
      suitableFor: ["Dry skin", "Sensitive skin", "Normal skin"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 279, discountPrice: 229, stock: 60, sku: "NZ-FC-004-100" },
      ],
    },

    // ── BODY CARE ─────────────────────────────────────────
    {
      name: "Body Massage Oil Cedarwood",
      slug: "body-massage-oil-cedarwood",
      description:
        "A luxurious body massage oil with cedarwood essential oil that relaxes muscles, nourishes skin and leaves a long-lasting natural woody fragrance.",
      price: 449,
      discountPrice: 379,
      image: "/products/body-massage-oil-cedarwood.jpg",
      images: ["/products/body-massage-oil-cedarwood.jpg"],
      category: cat("massage-oil"),
      stock: 55,
      sku: "NZ-BC-001",
      ingredients: ["Cedarwood Essential Oil", "Sweet Almond Oil", "Jojoba Oil", "Vitamin E", "Lavender"],
      benefits: ["Muscle relaxation", "Deep nourishment", "Stress relief", "Skin softening"],
      usage: "Warm a few drops in palms, massage gently on body in circular motions. Best used after shower.",
      suitableFor: ["All skin types", "Stressed muscles", "Dry skin"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 449, discountPrice: 379, stock: 35, sku: "NZ-BC-001-100" },
        { size: "200ml", unit: "ml", quantity: 200, price: 799, discountPrice: 669, stock: 20, sku: "NZ-BC-001-200" },
      ],
    },
    {
      name: "Aloe Vera Body Lotion",
      slug: "aloe-vera-body-lotion",
      description:
        "A light, non-greasy body lotion with pure aloe vera and cucumber extract that provides long-lasting hydration and soothes sun-exposed skin.",
      price: 349,
      discountPrice: 289,
      image: "/products/aloevera-body-lotion.jpg",
      images: ["/products/aloevera-body-lotion.jpg"],
      category: cat("body-care"),
      stock: 90,
      sku: "NZ-BC-002",
      ingredients: ["Aloe Vera Gel", "Cucumber Extract", "Hyaluronic Acid", "Vitamin C", "Shea Butter"],
      benefits: ["Long-lasting hydration", "Soothes skin", "Non-greasy", "Brightening"],
      usage: "Apply generously on body after bathing. Massage until fully absorbed.",
      suitableFor: ["All skin types", "Sun-exposed skin", "Dry skin"],
      sizes: [
        { size: "200ml", unit: "ml", quantity: 200, price: 349, discountPrice: 289, stock: 60, sku: "NZ-BC-002-200" },
        { size: "400ml", unit: "ml", quantity: 400, price: 599, discountPrice: 499, stock: 30, sku: "NZ-BC-002-400" },
      ],
    },
    {
      name: "Turmeric Body Scrub",
      slug: "turmeric-body-scrub",
      description:
        "A brightening body scrub with turmeric, walnut shell powder and coconut oil that exfoliates dead skin, removes tan and reveals glowing skin.",
      price: 379,
      discountPrice: 319,
      image: "/products/turmeric-body-scrub.jpg",
      images: ["/products/turmeric-body-scrub.jpg"],
      category: cat("body-care"),
      stock: 65,
      sku: "NZ-BC-003",
      ingredients: ["Turmeric Powder", "Walnut Shell Powder", "Coconut Oil", "Glycerin", "Papaya Extract"],
      benefits: ["Exfoliation", "Tan removal", "Skin brightening", "Smooth skin"],
      usage: "Apply on damp skin, scrub gently in circular motions for 2-3 minutes, rinse off. Use 2-3 times per week.",
      suitableFor: ["All skin types", "Tanned skin", "Rough skin"],
      sizes: [
        { size: "200g", unit: "g", quantity: 200, price: 379, discountPrice: 319, stock: 45, sku: "NZ-BC-003-200" },
      ],
    },
    {
      name: "Rose Bathing Salt",
      slug: "rose-bathing-salt",
      description:
        "Luxurious rose-infused bath salts with Himalayan pink salt and essential oils that relax your body, soften skin and leave you refreshed.",
      price: 329,
      discountPrice: 269,
      image: "/products/rose-bathing-salt.jpg",
      images: ["/products/rose-bathing-salt.jpg"],
      category: cat("bath-shower"),
      stock: 80,
      sku: "NZ-BS-001",
      ingredients: ["Himalayan Pink Salt", "Rose Petals", "Rose Essential Oil", "Lavender Oil", "Vitamin E"],
      benefits: ["Muscle relaxation", "Skin softening", "Aromatherapy", "Stress relief"],
      usage: "Add 2-3 tablespoons to warm bath water. Soak for 15-20 minutes. Rinse off.",
      suitableFor: ["All skin types", "Stress relief", "After workout"],
      sizes: [
        { size: "300g", unit: "g", quantity: 300, price: 329, discountPrice: 269, stock: 50, sku: "NZ-BS-001-300" },
        { size: "500g", unit: "g", quantity: 500, price: 499, discountPrice: 419, stock: 30, sku: "NZ-BS-001-500" },
      ],
    },

    // ── HAIR CARE ─────────────────────────────────────────
    {
      name: "Hair Conditioner Nourish & Shine",
      slug: "hair-conditioner-nourish-shine",
      description:
        "A rich conditioning treatment with argan oil and keratin protein that deeply nourishes hair, reduces frizz and adds brilliant shine to all hair types.",
      price: 349,
      discountPrice: 289,
      image: "/products/hair-conditioner.jpg",
      images: ["/products/hair-conditioner.jpg"],
      category: cat("hair-care"),
      stock: 85,
      sku: "NZ-HC-001",
      ingredients: ["Argan Oil", "Keratin Protein", "Coconut Milk", "Vitamin B5", "Silk Amino Acids"],
      benefits: ["Deep nourishment", "Frizz control", "Shine enhancement", "Strengthens hair"],
      usage: "After shampooing, apply on hair lengths, leave for 2-3 minutes, rinse thoroughly.",
      suitableFor: ["All hair types", "Dry hair", "Frizzy hair"],
      sizes: [
        { size: "200ml", unit: "ml", quantity: 200, price: 349, discountPrice: 289, stock: 55, sku: "NZ-HC-001-200" },
        { size: "400ml", unit: "ml", quantity: 400, price: 599, discountPrice: 499, stock: 30, sku: "NZ-HC-001-400" },
      ],
    },
    {
      name: "Bhringraj Hair Serum",
      slug: "bhringraj-hair-serum",
      description:
        "A potent hair serum with Bhringraj and Onion extract that reduces hair fall, promotes growth and strengthens hair roots from within.",
      price: 399,
      discountPrice: 339,
      image: "/products/bhringraj-hair-serum.jpg",
      images: ["/products/bhringraj-hair-serum.jpg"],
      category: cat("hair-care"),
      stock: 60,
      sku: "NZ-HC-002",
      ingredients: ["Bhringraj Extract", "Onion Oil", "Castor Oil", "Biotin", "Vitamin E"],
      benefits: ["Reduces hair fall", "Promotes growth", "Strengthens roots", "Nourishes scalp"],
      usage: "Apply a few drops on scalp, massage gently. Leave overnight or for 1 hour before washing.",
      suitableFor: ["All hair types", "Hair fall", "Thinning hair"],
      sizes: [
        { size: "50ml", unit: "ml", quantity: 50, price: 399, discountPrice: 339, stock: 60, sku: "NZ-HC-002-50" },
      ],
    },
    {
      name: "Aloe Vera Shampoo Sulphate Free",
      slug: "aloe-vera-shampoo-sulphate-free",
      description:
        "A gentle sulphate-free shampoo with pure aloe vera and green tea extract that cleanses hair without stripping natural oils.",
      price: 299,
      discountPrice: 249,
      image: "/products/aloe-shampoo.jpg",
      images: ["/products/aloe-shampoo.jpg"],
      category: cat("hair-care"),
      stock: 100,
      sku: "NZ-HC-003",
      ingredients: ["Aloe Vera", "Green Tea Extract", "Argan Oil", "Vitamin B5", "Coconut Derived Cleansers"],
      benefits: ["Gentle cleansing", "No sulphates", "Preserves natural oils", "Scalp soothing"],
      usage: "Apply on wet hair, lather well, massage scalp gently, rinse thoroughly. Use 3-4 times per week.",
      suitableFor: ["All hair types", "Sensitive scalp", "Colour treated hair"],
      sizes: [
        { size: "200ml", unit: "ml", quantity: 200, price: 299, discountPrice: 249, stock: 65, sku: "NZ-HC-003-200" },
        { size: "400ml", unit: "ml", quantity: 400, price: 519, discountPrice: 439, stock: 35, sku: "NZ-HC-003-400" },
      ],
    },

    // ── SOAPS ──────────────────────────────────────────────
    {
      name: "Lemon Designer Soap",
      slug: "lemon-designer-soap",
      description:
        "A refreshing handcrafted lemon soap with vitamin C and citrus extracts that brightens skin, removes blemishes and leaves a clean citrusy fragrance.",
      price: 149,
      discountPrice: 119,
      image: "/products/lemon-designer-soap.jpg",
      images: ["/products/lemon-designer-soap.jpg"],
      category: cat("soaps"),
      stock: 150,
      sku: "NZ-SP-001",
      ingredients: ["Lemon Extract", "Vitamin C", "Citric Acid", "Coconut Oil", "Shea Butter"],
      benefits: ["Skin brightening", "Removes blemishes", "Deep cleansing", "Refreshing"],
      usage: "Use daily for bathing. Lather well and rinse.",
      suitableFor: ["All skin types", "Dull skin", "Oily skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 149, discountPrice: 119, stock: 100, sku: "NZ-SP-001-100" },
      ],
    },
    {
      name: "Jasmine Aissis Soap",
      slug: "jasmine-aissis-soap",
      description:
        "A luxurious jasmine-infused soap with milk protein and shea butter that deeply moisturises skin and leaves a beautiful floral fragrance all day.",
      price: 179,
      discountPrice: 149,
      image: "/products/jasmine-aissis-soap.jpg",
      images: ["/products/jasmine-aissis-soap.jpg"],
      category: cat("soaps"),
      stock: 130,
      sku: "NZ-SP-002",
      ingredients: ["Jasmine Extract", "Milk Protein", "Shea Butter", "Glycerin", "Vitamin E"],
      benefits: ["Deep moisturisation", "Long lasting fragrance", "Soft skin", "Gentle cleansing"],
      usage: "Use daily for bathing. Lather on wet skin and rinse thoroughly.",
      suitableFor: ["All skin types", "Dry skin", "Normal skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 179, discountPrice: 149, stock: 90, sku: "NZ-SP-002-100" },
      ],
    },
    {
      name: "Charcoal Detox Soap",
      slug: "charcoal-detox-soap",
      description:
        "A powerful activated charcoal soap that draws out toxins, unclogs pores, controls excess oil and leaves skin deeply cleansed and refreshed.",
      price: 159,
      discountPrice: 129,
      image: "/products/charcoal-detox-soap.jpg",
      images: ["/products/charcoal-detox-soap.jpg"],
      category: cat("soaps"),
      stock: 110,
      sku: "NZ-SP-003",
      ingredients: ["Activated Charcoal", "Tea Tree Oil", "Kaolin Clay", "Coconut Oil", "Peppermint"],
      benefits: ["Pore cleansing", "Detoxifying", "Oil control", "Antibacterial"],
      usage: "Use daily. Lather on wet skin, leave for 30 seconds, rinse.",
      suitableFor: ["Oily skin", "Acne-prone skin", "Congested skin"],
      sizes: [
        { size: "100g", unit: "g", quantity: 100, price: 159, discountPrice: 129, stock: 75, sku: "NZ-SP-003-100" },
      ],
    },

    // ── GIFT KITS ─────────────────────────────────────────
    {
      name: "Comfort Mono Gift Kit",
      slug: "comfort-mono-gift-kit",
      description:
        "A thoughtfully curated single-product gift kit perfect for gifting to loved ones. Comes in beautiful eco-friendly packaging with a personalised message card.",
      price: 599,
      discountPrice: 499,
      image: "/products/comfort-mono-gift-kit.jpg",
      images: ["/products/comfort-mono-gift-kit.jpg"],
      category: cat("gift-kits"),
      stock: 40,
      sku: "NZ-GK-001",
      ingredients: [],
      benefits: ["Perfect gifting option", "Eco-friendly packaging", "Personalised message", "Premium presentation"],
      usage: "Select your preferred product. Add a personalised message at checkout.",
      suitableFor: ["Gifting", "All occasions"],
      sizes: [],
    },
    {
      name: "Comfort Neo Gift Kit",
      slug: "comfort-neo-gift-kit",
      description:
        "A premium gift kit with 3 handpicked Nezal bestsellers — face wash, body lotion and a soap — presented in an elegant gift box.",
      price: 999,
      discountPrice: 849,
      image: "/products/comfort-neo-gift-kit.jpg",
      images: ["/products/comfort-neo-gift-kit.jpg"],
      category: cat("gift-kits"),
      stock: 30,
      sku: "NZ-GK-002",
      ingredients: [],
      benefits: ["3 bestsellers included", "Luxury gift box", "Free gift wrapping", "Ideal for all occasions"],
      usage: "Contains: 1 Face Wash (100ml) + 1 Body Lotion (200ml) + 1 Soap (100g).",
      suitableFor: ["Gifting", "Birthdays", "Festivals"],
      sizes: [],
    },

    // ── INTIMATE HYGIENE ──────────────────────────────────
    {
      name: "Intimate Hygiene Foam Wash Unisex",
      slug: "intimate-hygiene-foam-wash-unisex",
      description:
        "A gentle, pH-balanced unisex intimate hygiene foam wash with lactic acid and tea tree oil that cleanses, protects and maintains intimate area health.",
      price: 349,
      discountPrice: 299,
      image: "/products/intimate-hygiene-foam-wash.jpg",
      images: ["/products/intimate-hygiene-foam-wash.jpg"],
      category: cat("intimate-hygiene"),
      stock: 70,
      sku: "NZ-IH-001",
      ingredients: ["Lactic Acid", "Tea Tree Oil", "Aloe Vera", "Chamomile Extract", "Witch Hazel"],
      benefits: ["pH balanced", "Gentle cleansing", "Odour protection", "Soothes irritation"],
      usage: "Apply a small amount, lather gently, rinse with water. Use daily.",
      suitableFor: ["All skin types", "Sensitive skin", "Unisex"],
      sizes: [
        { size: "100ml", unit: "ml", quantity: 100, price: 349, discountPrice: 299, stock: 70, sku: "NZ-IH-001-100" },
      ],
    },
  ];

  const products = await Product.insertMany(
    productsData.map((p) => ({ ...p, company: company._id }))
  );
  console.log(`   ✓ ${products.length} products created`);

  // Helper: find product by slug
  const prod = (slug) => products.find((p) => p.slug === slug);

  // ────────────────────────────────────────────────────────
  //  5. UPDATE COMPANY — newArrivals + shopByConcern
  // ────────────────────────────────────────────────────────
  console.log("🏢  Updating company with arrivals & concerns...");

  const newArrivalsData = [
    { productId: prod("ubtan-d-tan-face-wash")._id,           title: "Ubtan D-Tan Face Wash",         image: "/products/ubtan-dtan-facewash.jpg",        description: "Best seller for tan removal",      position: 1 },
    { productId: prod("neem-tulsi-face-wash")._id,            title: "Neem Tulsi Face Wash",           image: "/products/neem-tulsi-facewash.jpg",         description: "Fight acne naturally",             position: 2 },
    { productId: prod("hair-conditioner-nourish-shine")._id,  title: "Hair Conditioner Nourish",       image: "/products/hair-conditioner.jpg",            description: "For all hair types",               position: 3 },
    { productId: prod("body-massage-oil-cedarwood")._id,      title: "Body Massage Oil Cedarwood",     image: "/products/body-massage-oil-cedarwood.jpg",  description: "Relax and rejuvenate",             position: 4 },
    { productId: prod("almond-nourishing-cream")._id,         title: "Almond Nourishing Cream",        image: "/products/almond-nourishing-cream.jpg",     description: "Deep moisture for dry skin",       position: 5 },
    { productId: prod("bhringraj-hair-serum")._id,            title: "Bhringraj Hair Serum",           image: "/products/bhringraj-hair-serum.jpg",        description: "Reduces hair fall",                position: 6 },
    { productId: prod("rose-bathing-salt")._id,               title: "Rose Bathing Salt",              image: "/products/rose-bathing-salt.jpg",           description: "Luxury bath experience",          position: 7 },
    { productId: prod("lemon-designer-soap")._id,             title: "Lemon Designer Soap",            image: "/products/lemon-designer-soap.jpg",         description: "Bright, clean citrus skin",        position: 8 },
  ];

  const shopByConcernData = [
    { title: "Face Care",     image: "/shop-by-concern/face-care.jpg",     product: prod("ubtan-d-tan-face-wash")._id,      description: "Glow naturally every day",                  priority: 1 },
    { title: "Body Care",     image: "/shop-by-concern/body-care.jpg",     product: prod("aloe-vera-body-lotion")._id,      description: "Nourish hydrate refresh",                   priority: 2 },
    { title: "Bath & Shower", image: "/shop-by-concern/bath-shower.jpg",   product: prod("rose-bathing-salt")._id,          description: "Cleanse with nature's touch",               priority: 3 },
    { title: "Massage Oil",   image: "/shop-by-concern/massage-oil.jpg",   product: prod("body-massage-oil-cedarwood")._id, description: "Sustainably sourced planet-friendly",       priority: 4 },
    { title: "Hair Care",     image: "/shop-by-concern/hair-care.jpg",     product: prod("bhringraj-hair-serum")._id,       description: "Strong shiny healthy hair",                 priority: 5 },
    { title: "Gift Kits",     image: "/shop-by-concern/gift-kits.jpg",     product: prod("comfort-neo-gift-kit")._id,       description: "Perfect gifts for loved ones",              priority: 6 },
  ];

  await Company.findByIdAndUpdate(company._id, {
    newArrivals: newArrivalsData,
    shopByConcern: shopByConcernData,
  });
  console.log("   ✓ Company arrivals & concerns updated");

  // ────────────────────────────────────────────────────────
  //  6. PROMOS
  // ────────────────────────────────────────────────────────
  console.log("🏷️   Seeding promos...");

  await Promo.insertMany([
    {
      title: "Sitewide Sale",
      message: "🌿 25% OFF Site-Wide! Use code NEZAL25 at checkout. Free shipping above ₹499.",
      link: "/shop/nezal-herbocare",
      linkText: "Shop Now",
      backgroundColor: "#1B6B2F",
      textColor: "#FFFFFF",
      isActive: true,
      priority: 1,
    },
    {
      title: "New Arrival",
      message: "✨ New Arrivals: Bhringraj Hair Serum & Rose Bathing Salt — Limited Stock!",
      link: "/shop/nezal-herbocare",
      linkText: "Explore",
      backgroundColor: "#1B6B2F",
      textColor: "#FFFFFF",
      isActive: true,
      priority: 2,
    },
    {
      title: "Free Shipping",
      message: "🚚 Free Shipping on all orders above ₹499. COD available across India.",
      link: "/shop/nezal-herbocare",
      linkText: "Shop Now",
      backgroundColor: "#14501F",
      textColor: "#FFFFFF",
      isActive: false,
      priority: 3,
    },
  ]);
  console.log("   ✓ 3 promos created (2 active, 1 inactive)");

  // ────────────────────────────────────────────────────────
  //  7. REVIEWS
  // ────────────────────────────────────────────────────────
  console.log("⭐  Seeding reviews...");

  const reviewsData = [
    {
      product: prod("ubtan-d-tan-face-wash")._id,
      user: users[1]._id, userName: "Priya Sharma", userEmail: "priya.sharma@gmail.com",
      rating: 5,
      comment: "Absolutely love this face wash! My tan has reduced significantly in just 2 weeks of use. The turmeric really works — my skin feels brighter and more even. Would definitely recommend to anyone with tanned skin.",
    },
    {
      product: prod("neem-tulsi-face-wash")._id,
      user: users[2]._id, userName: "Kajal Verma", userEmail: "kajal.verma@gmail.com",
      rating: 5,
      comment: "Lumiflora's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      product: prod("almond-nourishing-cream")._id,
      user: users[3]._id, userName: "Bhumika Patel", userEmail: "bhumika.patel@gmail.com",
      rating: 5,
      comment: "Nezal's complete kit reduces pores and blemishes, providing bright skin. Enriched with botanical extracts and VitaCeramide, this toner deeply hydrates, tightens pores, and retextures rough skin.",
    },
    {
      product: prod("body-massage-oil-cedarwood")._id,
      user: users[4]._id, userName: "Rajani Singh", userEmail: "rajani.singh@gmail.com",
      rating: 4,
      comment: "The cedarwood massage oil is fantastic! It has a beautiful natural scent and my skin feels incredibly soft after use. Absorbs well without feeling too greasy. Slight minus — packaging could be improved.",
    },
    {
      product: prod("hair-conditioner-nourish-shine")._id,
      user: users[5]._id, userName: "Sneha Reddy", userEmail: "sneha.reddy@gmail.com",
      rating: 5,
      comment: "My hair has never been this shiny! The conditioner smells amazing and really detangles my hair. I have very frizzy hair and this has made a noticeable difference in just 3 weeks of regular use.",
    },
    {
      product: prod("lemon-designer-soap")._id,
      user: users[1]._id, userName: "Priya Sharma", userEmail: "priya.sharma@gmail.com",
      rating: 4,
      comment: "Very refreshing soap! The lemon scent is so fresh and natural — not artificial at all. Leaves my skin feeling clean and bright. Will definitely repurchase. Would be 5 stars if it lasted longer.",
    },
    {
      product: prod("rose-bathing-salt")._id,
      user: users[2]._id, userName: "Kajal Verma", userEmail: "kajal.verma@gmail.com",
      rating: 5,
      comment: "The rose bathing salts are pure luxury! I add them to my bath every Sunday and it completely transforms the experience. My skin is so soft afterwards and the rose scent lingers beautifully. 10/10!",
    },
    {
      product: prod("bhringraj-hair-serum")._id,
      user: users[3]._id, userName: "Bhumika Patel", userEmail: "bhumika.patel@gmail.com",
      rating: 5,
      comment: "I was losing a lot of hair and this serum has genuinely helped. After 6 weeks of use I can see new baby hairs growing and my overall hair fall has reduced. The onion smell is there but very mild. Totally worth it.",
    },
  ];

  await Review.insertMany(reviewsData.map((r) => ({ ...r, company: company._id })));
  console.log(`   ✓ ${reviewsData.length} reviews created`);

  // ────────────────────────────────────────────────────────
  //  8. ORDERS
  // ────────────────────────────────────────────────────────
  console.log("📋  Seeding orders...");

  const ordersData = [
    {
      orderNumber: "NZ-2024-0001",
      user: users[1]._id,
      items: [
        { product: prod("ubtan-d-tan-face-wash")._id, quantity: 2, price: 249, selectedSize: { size: "100ml", unit: "ml", quantity: 100, price: 299, discountPrice: 249 } },
        { product: prod("neem-tulsi-face-wash")._id,  quantity: 1, price: 199, selectedSize: { size: "100ml", unit: "ml", quantity: 100, price: 249, discountPrice: 199 } },
      ],
      totalAmount: 697,
      shippingAddress: { name: "Priya Sharma", phone: "+919876543210", address: "12, Rose Garden Society", street: "12, Rose Garden Society", city: "Mumbai", state: "Maharashtra", pincode: "400054", zipCode: "400054", country: "India" },
      paymentStatus: "completed",
      paymentMethod: "razorpay",
      orderStatus: "delivered",
      razorpayOrderId: "order_NZtest001",
      razorpayPaymentId: "pay_NZtest001",
    },
    {
      orderNumber: "NZ-2024-0002",
      user: users[2]._id,
      items: [
        { product: prod("hair-conditioner-nourish-shine")._id, quantity: 1, price: 289, selectedSize: { size: "200ml", unit: "ml", quantity: 200, price: 349, discountPrice: 289 } },
        { product: prod("bhringraj-hair-serum")._id,           quantity: 1, price: 339, selectedSize: { size: "50ml",  unit: "ml", quantity: 50,  price: 399, discountPrice: 339 } },
        { product: prod("aloe-vera-shampoo-sulphate-free")._id, quantity: 1, price: 249, selectedSize: { size: "200ml", unit: "ml", quantity: 200, price: 299, discountPrice: 249 } },
      ],
      totalAmount: 877,
      shippingAddress: { name: "Kajal Verma", phone: "+919845001122", address: "B-7, Green Park", street: "B-7, Green Park", city: "Delhi", state: "Delhi", pincode: "110016", zipCode: "110016", country: "India" },
      paymentStatus: "completed",
      paymentMethod: "razorpay",
      orderStatus: "shipped",
      razorpayOrderId: "order_NZtest002",
      razorpayPaymentId: "pay_NZtest002",
    },
    {
      orderNumber: "NZ-2024-0003",
      user: users[3]._id,
      items: [
        { product: prod("comfort-neo-gift-kit")._id, quantity: 1, price: 849 },
        { product: prod("rose-bathing-salt")._id,    quantity: 2, price: 269, selectedSize: { size: "300g", unit: "g", quantity: 300, price: 329, discountPrice: 269 } },
      ],
      totalAmount: 1387,
      shippingAddress: { name: "Bhumika Patel", phone: "+919912345678", address: "Flat 3A, Sunshine Apartments", street: "Flat 3A, Sunshine Apartments", city: "Ahmedabad", state: "Gujarat", pincode: "380015", zipCode: "380015", country: "India" },
      paymentStatus: "completed",
      paymentMethod: "cod",
      orderStatus: "processing",
    },
    {
      orderNumber: "NZ-2024-0004",
      user: users[4]._id,
      items: [
        { product: prod("body-massage-oil-cedarwood")._id, quantity: 1, price: 379, selectedSize: { size: "100ml", unit: "ml", quantity: 100, price: 449, discountPrice: 379 } },
        { product: prod("aloe-vera-body-lotion")._id,      quantity: 1, price: 289, selectedSize: { size: "200ml", unit: "ml", quantity: 200, price: 349, discountPrice: 289 } },
        { product: prod("turmeric-body-scrub")._id,        quantity: 1, price: 319, selectedSize: { size: "200g",  unit: "g",  quantity: 200, price: 379, discountPrice: 319 } },
      ],
      totalAmount: 987,
      shippingAddress: { name: "Rajani Singh", phone: "+919798765432", address: "C-22, Laxmi Nagar", street: "C-22, Laxmi Nagar", city: "Pune", state: "Maharashtra", pincode: "411001", zipCode: "411001", country: "India" },
      paymentStatus: "completed",
      paymentMethod: "razorpay",
      orderStatus: "pending",
      razorpayOrderId: "order_NZtest004",
      razorpayPaymentId: "pay_NZtest004",
    },
    {
      orderNumber: "NZ-2024-0005",
      user: users[1]._id,
      items: [
        { product: prod("lemon-designer-soap")._id,   quantity: 3, price: 119, selectedSize: { size: "100g", unit: "g", quantity: 100, price: 149, discountPrice: 119 } },
        { product: prod("jasmine-aissis-soap")._id,   quantity: 2, price: 149, selectedSize: { size: "100g", unit: "g", quantity: 100, price: 179, discountPrice: 149 } },
        { product: prod("charcoal-detox-soap")._id,   quantity: 2, price: 129, selectedSize: { size: "100g", unit: "g", quantity: 100, price: 159, discountPrice: 129 } },
      ],
      totalAmount: 913,
      shippingAddress: { name: "Priya Sharma", phone: "+919876543210", address: "12, Rose Garden Society", street: "12, Rose Garden Society", city: "Mumbai", state: "Maharashtra", pincode: "400054", zipCode: "400054", country: "India" },
      paymentStatus: "completed",
      paymentMethod: "cod",
      orderStatus: "delivered",
    },
  ];

  await Order.insertMany(ordersData);
  console.log(`   ✓ ${ordersData.length} orders created`);

  // ────────────────────────────────────────────────────────
  //  DONE
  // ────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("✅  SEED COMPLETE — Summary:");
  console.log(`   👤 Users    : ${users.length}  (1 admin + 5 customers)`);
  console.log(`   🏢 Companies: 1  (Nezal Herbocare)`);
  console.log(`   📂 Categories: ${categories.length}`);
  console.log(`   📦 Products : ${products.length}`);
  console.log(`   🏷️  Promos   : 3  (2 active)`);
  console.log(`   ⭐ Reviews  : ${reviewsData.length}`);
  console.log(`   📋 Orders   : ${ordersData.length}`);
  console.log("══════════════════════════════════════════");
  console.log("\n🔑  Login credentials:");
  console.log("   Admin  → admin@nezal.com     / Admin@1234");
  console.log("   User   → priya.sharma@gmail.com / User@1234");
  console.log("══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  console.error(err);
  process.exit(1);
});