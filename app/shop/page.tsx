// app/shop/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X, Search, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  company: { name: string; slug: string };
  concerns?: string[];
  skinTypes?: string[];
  category?: { slug: string };
}

interface Company {
  _id: string;
  name: string;
  slug: string;
}

type SortOption = "price_asc" | "price_desc" | "name_asc" | "newest";

// ─── Static filter data (from Nezal product catalogue) ───────────────────────

const CATEGORIES = [
  { slug: "hair-care",        label: "Hair Care" },
  { slug: "body-care",        label: "Body Care" },
  { slug: "face-care",        label: "Face Care" },
  { slug: "bath-shower",      label: "Bath & Shower" },
  { slug: "soaps",            label: "Soaps" },
  { slug: "intimate-hygiene", label: "Intimate Hygiene" },
  { slug: "gift-kits",        label: "Gift Kits" },
  { slug: "massage-oil",      label: "Massage Oil" },
];

const CONCERNS = [
  { slug: "acne",           label: "Acne" },
  { slug: "dandruff",       label: "Dandruff" },
  { slug: "hairfall",       label: "Hairfall" },
  { slug: "dryness",        label: "Dryness" },
  { slug: "pigmentation",   label: "Pigmentation" },
  { slug: "dullness",       label: "Dullness" },
  { slug: "oily-skin",      label: "Oily Skin" },
  { slug: "sensitive-skin", label: "Sensitive Skin" },
  { slug: "open-pores",     label: "Open Pores" },
  { slug: "stress-relief",  label: "Stress Relief" },
  { slug: "hydration",      label: "Hydration" },
  { slug: "thinning-hair",  label: "Thinning Hair" },
];

const SKIN_TYPES = [
  { slug: "dry",         label: "Dry" },
  { slug: "oily",        label: "Oily" },
  { slug: "combination", label: "Combination" },
  { slug: "sensitive",   label: "Sensitive" },
  { slug: "normal",      label: "Normal" },
  { slug: "all",         label: "All Types" },
];

const SOAP_COLLECTIONS = [
  { slug: "rock-soap",      label: "Rock Soap" },
  { slug: "designer-soap",  label: "Designer Soap" },
  { slug: "premium-soap",   label: "Premium Soap" },
  { slug: "aissis-soap",    label: "Aissis Soap" },
  { slug: "chip-soap",      label: "Chip Soap" },
  { slug: "round-soap",     label: "Round Soap" },
  { slug: "doobie-soap",    label: "Doobie Soap" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [filters, setFilters] = useState({
    company:   "",
    category:  "",
    concern:   "",
    skinType:  "",
    collection: "",
    minPrice:  0,
    maxPrice:  10000,
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch companies once
  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(Array.isArray(d) ? d : d.data ?? []))
      .catch(console.error);
  }, []);

  // Fetch products whenever filters / page / sort change
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "12");
      if (filters.company)    params.append("company",  filters.company);
      if (filters.category)   params.append("category", filters.category);
      if (filters.concern)    params.append("concern",  filters.concern);
      if (filters.skinType)   params.append("skinType", filters.skinType);
      if (filters.collection) params.append("collectionSlug", filters.collection);
      if (filters.minPrice > 0)      params.append("minPrice", filters.minPrice.toString());
      if (filters.maxPrice < 10000)  params.append("maxPrice", filters.maxPrice.toString());
      if (sortBy) params.append("sort", sortBy);

      const res  = await fetch(`/api/products?${params}`);
      const data = await res.json();

      setProducts(data.products ?? []);
      const total = data.pagination?.total ?? data.total ?? data.products?.length ?? 0;
      setTotalProducts(total);
      setTotalPages(data.pagination?.pages ?? data.totalPages ?? Math.ceil(total / 12));
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Client-side search filter on top of API results
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filters, sortBy]);

  const setFilter = (key: keyof typeof filters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ company: "", category: "", concern: "", skinType: "", collection: "", minPrice: 0, maxPrice: 10000 });
    setSortBy("newest");
    setSearchQuery("");
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.company)    c++;
    if (filters.category)   c++;
    if (filters.concern)    c++;
    if (filters.skinType)   c++;
    if (filters.collection) c++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000) c++;
    return c;
  }, [filters]);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
      <div className="aspect-square w-full rounded-xl bg-gray-100" />
      <div className="mt-4 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
      <div className="mt-4 h-8 w-full rounded-lg bg-gray-100" />
    </div>
  );

  const sidebarProps = { companies, filters, setFilter, sortBy, setSortBy, clearFilters };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fafaf5] to-white">
      <div className="container-nezal py-10 md:py-16">

        {/* ── Mobile top bar ─────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 border-emerald-200 bg-white hover:bg-emerald-50">
                <Filter className="h-4 w-4 text-emerald-700" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] overflow-y-auto border-r border-emerald-100 bg-white p-0">
              <FilterSidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* ── Layout ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-emerald-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <FilterSidebar {...sidebarProps} />
            </div>
          </aside>

          {/* Product area */}
          <div className="md:col-span-3">

            {/* Desktop top bar */}
            <div className="mb-6 hidden items-center justify-between md:flex">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-800">
                    {searchQuery ? filteredProducts.length : totalProducts}
                  </span>{" "}products found
                </p>
                <div className="h-5 w-px bg-gray-200" />
                <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                  <SelectTrigger className="w-[180px] border-gray-200 bg-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="price_asc">Price: Low → High</SelectItem>
                    <SelectItem value="price_desc">Price: High → Low</SelectItem>
                    <SelectItem value="name_asc">Name: A → Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {filters.company    && <FilterTag label={`Brand: ${companies.find(c => c.slug === filters.company)?.name ?? filters.company}`} onRemove={() => setFilter("company", "")} />}
                {filters.category   && <FilterTag label={`Category: ${CATEGORIES.find(c => c.slug === filters.category)?.label ?? filters.category}`} onRemove={() => setFilter("category", "")} />}
                {filters.concern    && <FilterTag label={`Concern: ${CONCERNS.find(c => c.slug === filters.concern)?.label ?? filters.concern}`} onRemove={() => setFilter("concern", "")} />}
                {filters.skinType   && <FilterTag label={`Skin: ${SKIN_TYPES.find(s => s.slug === filters.skinType)?.label ?? filters.skinType}`} onRemove={() => setFilter("skinType", "")} />}
                {filters.collection && <FilterTag label={`Collection: ${SOAP_COLLECTIONS.find(s => s.slug === filters.collection)?.label ?? filters.collection}`} onRemove={() => setFilter("collection", "")} />}
                {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
                  <FilterTag label={`₹${filters.minPrice} – ₹${filters.maxPrice}`} onRemove={() => { setFilter("minPrice", 0); setFilter("maxPrice", 10000); }} />
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-emerald-600 hover:bg-emerald-50">
                  Clear all
                </Button>
              </div>
            )}

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex h-96 flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white p-8 text-center"
              >
                <div className="rounded-full bg-emerald-50 p-4">
                  <Search className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-800">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Try removing some filters or search differently.</p>
                <Button onClick={clearFilters} variant="outline" className="mt-6 border-emerald-200 text-emerald-700">
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={page + searchQuery}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredProducts.map((product, idx) => (
                      <motion.div
                        key={product._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <ProductCard
                          id={product._id}
                          name={product.name}
                          price={product.price}
                          discountPrice={product.discountPrice}
                          image={product.image}
                          company={product.company}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-col items-center gap-3">
                    <nav className="flex items-center gap-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let n = i + 1;
                        if (totalPages > 5) {
                          if (page <= 3) n = i + 1;
                          else if (page >= totalPages - 2) n = totalPages - 4 + i;
                          else n = page - 2 + i;
                        }
                        return (
                          <Button
                            key={n} variant={n === page ? "default" : "outline"} size="sm"
                            onClick={() => setPage(n)}
                            className={n === page ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border-emerald-200 hover:bg-emerald-50"}
                          >
                            {n}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Next
                      </Button>
                    </nav>
                    <p className="text-xs text-gray-400">
                      Showing {(page - 1) * 12 + 1}–{Math.min(page * 12, totalProducts)} of {totalProducts} products
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

interface FilterSidebarProps {
  companies: Company[];
  filters: {
    company: string; category: string; concern: string;
    skinType: string; collection: string; minPrice: number; maxPrice: number;
  };
  setFilter: (key: string, value: string | number) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  clearFilters: () => void;
}

function FilterSidebar({ companies, filters, setFilter, sortBy, setSortBy, clearFilters }: FilterSidebarProps) {
  const [open, setOpen] = useState({
    category: true, concern: true, skinType: false,
    collection: false, brand: false, price: false, sort: false,
  });

  const toggle = (k: keyof typeof open) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
          <span className="font-semibold text-gray-900">Filters</span>
        </div>
        <button onClick={clearFilters} className="text-xs text-emerald-600 hover:underline">
          Clear all
        </button>
      </div>

      {/* Category */}
      <Section label="Category" open={open.category} onToggle={() => toggle("category")}>
        <PillGroup
          items={CATEGORIES}
          active={filters.category}
          onSelect={(v) => setFilter("category", filters.category === v ? "" : v)}
        />
      </Section>

      {/* Concern */}
      <Section label="Skin concern" open={open.concern} onToggle={() => toggle("concern")}>
        <PillGroup
          items={CONCERNS}
          active={filters.concern}
          onSelect={(v) => setFilter("concern", filters.concern === v ? "" : v)}
        />
      </Section>

      {/* Skin type */}
      <Section label="Skin type" open={open.skinType} onToggle={() => toggle("skinType")}>
        <PillGroup
          items={SKIN_TYPES}
          active={filters.skinType}
          onSelect={(v) => setFilter("skinType", filters.skinType === v ? "" : v)}
        />
      </Section>

      {/* Soap collection */}
      <Section label="Soap collection" open={open.collection} onToggle={() => toggle("collection")}>
        <PillGroup
          items={SOAP_COLLECTIONS}
          active={filters.collection}
          onSelect={(v) => setFilter("collection", filters.collection === v ? "" : v)}
        />
      </Section>

      {/* Brand */}
      <Section label="Brand" open={open.brand} onToggle={() => toggle("brand")}>
        <select
          value={filters.company}
          onChange={(e) => setFilter("company", e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All brands</option>
          {companies.map((c) => (
            <option key={c._id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </Section>

      {/* Price */}
      <Section label="Price range" open={open.price} onToggle={() => toggle("price")}>
        <div className="space-y-4">
          <Slider
            min={0} max={10000} step={50}
            value={[filters.minPrice, filters.maxPrice]}
            onValueChange={([min, max]: number[]) => { setFilter("minPrice", min); setFilter("maxPrice", max); }}
            className="my-1"
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Min (₹)</label>
              <input
                type="number" value={filters.minPrice} min={0}
                onChange={(e) => setFilter("minPrice", Math.min(Number(e.target.value), filters.maxPrice - 50))}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Max (₹)</label>
              <input
                type="number" value={filters.maxPrice} max={10000}
                onChange={(e) => setFilter("maxPrice", Math.max(Number(e.target.value), filters.minPrice + 50))}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>₹0</span><span>₹2.5k</span><span>₹5k</span><span>₹7.5k</span><span>₹10k</span>
          </div>
        </div>
      </Section>

      {/* Sort (mobile only — desktop has it in top bar) */}
      <div className="block md:hidden">
        <Section label="Sort by" open={open.sort} onToggle={() => toggle("sort")}>
          <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
            <SelectTrigger className="w-full border-gray-200 bg-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
              <SelectItem value="name_asc">Name: A → Z</SelectItem>
            </SelectContent>
          </Select>
        </Section>
      </div>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function Section({
  label, open, onToggle, children,
}: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-gray-800 hover:text-emerald-700"
      >
        {label}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function PillGroup({
  items, active, onSelect,
}: {
  items: { slug: string; label: string }[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.slug}
          onClick={() => onSelect(item.slug)}
          className={`rounded-full px-3 py-1.5 text-xs transition-all ${
            active === item.slug
              ? "bg-emerald-700 text-white"
              : "border border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-emerald-200">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}