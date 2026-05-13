import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
    },
    discountPrice: Number,
    image: String,
    images: [String],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
    sku: String,
    ingredients: [String],
    benefits: [String],
    usage: String,
    suitableFor: [String],
    results: [
      {
        image: String,
        title: String,
        text: String,
      },
    ],
    // New: Size variants with individual pricing and stock
    sizes: [
      {
        size: String, // e.g., "50ml", "100ml", "1L"
        unit: {
          type: String,
          enum: ["ml", "l", "g", "kg"],
          default: "ml",
        },
        quantity: Number, // e.g., 50, 100, 1000
        price: Number, // Individual price for this size
        discountPrice: Number, // Individual discount price
        stock: {
          type: Number,
          default: 0,
        },
        sku: String, // Optional SKU for this specific size
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      // Compound index for active products with company/category filtering
      { isActive: 1, company: 1, category: 1 },
      // Index for sorting by creation date
      { createdAt: -1 },
      // Index for slug lookups
      { slug: 1 },
      // Index for company-based queries
      { company: 1 },
      // Index for category-based queries
      { category: 1 },
      // Compound index for active products sorted by creation
      { isActive: 1, createdAt: -1 },
    ]
  },
)

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema)
