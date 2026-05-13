// app/shop/page.tsx (Redesigned)
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
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
import {
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
  SlidersHorizontal,
  Leaf,
} from "lucide-react";

// ========== Types ==========
interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  company: { name: string; slug: string };
}

interface Company {
  _id: string;
  name: string;
  slug: string;
}

type SortOption = "price_asc" | "price_desc" | "name_asc";

// ========== Main Component ==========
export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    company: "",
    minPrice: 0,
    maxPrice: 10000,
  });
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        setCompanies(data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "12");
      if (filters.company) params.append("company", filters.company);
      if (filters.minPrice > 0) params.append("minPrice", filters.minPrice.toString());
      if (filters.maxPrice < 10000) params.append("maxPrice", filters.maxPrice.toString());
      if (sortBy) params.append("sort", sortBy);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products);
      setTotalPages(data.totalPages || Math.ceil(data.total / 12));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [filters, sortBy]);

  const clearFilters = () => {
    setFilters({ company: "", minPrice: 0, maxPrice: 10000 });
    setSortBy("price_asc");
    setSearchQuery("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.company) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000) count++;
    if (sortBy !== "price_asc") count++;
    return count;
  }, [filters, sortBy]);

  // Skeleton loader
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
      <div className="aspect-square w-full rounded-xl bg-gray-100" />
      <div className="mt-4 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
      <div className="mt-4 h-8 w-full rounded-lg bg-gray-100" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fafaf5] to-white">
      {/* Hero Section – Nezal style */}
      {/* <div className="relative overflow-hidden bg-gradient-to-r from-[#1e3a28] to-[#2a5c3a]">
        <div className="absolute inset-0 bg-[url('/leaf-pattern.png')] opacity-10 bg-repeat" />
        <div className="container-nezal relative py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl">
              The Edit
            </h1>
            <p className="mt-4 text-lg text-emerald-100">
              Clean, conscious skincare – curated for your ritual.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-emerald-200">
              <Leaf className="h-4 w-4" />
              <span>100% Natural · Cruelty‑free · Dermatologically tested</span>
            </div>
          </motion.div>
        </div>
      </div> */}

      <div className="container-nezal py-10 md:py-16">
        {/* Mobile top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-emerald-200 bg-white hover:bg-emerald-50"
              >
                <Filter className="h-4 w-4 text-emerald-700" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] border-r border-emerald-100 bg-white p-0">
              <FilterSidebar
                companies={companies}
                filters={filters}
                setFilters={setFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
                clearFilters={clearFilters}
              />
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

        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Desktop Sidebar – Glassmorphic card */}
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-2xl border border-emerald-100 bg-white/80 backdrop-blur-sm p-6 shadow-sm transition-all hover:shadow-md">
              <FilterSidebar
                companies={companies}
                filters={filters}
                setFilters={setFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
                clearFilters={clearFilters}
              />
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="md:col-span-3">
            {/* Desktop top bar */}
            <div className="mb-8 hidden items-center justify-between md:flex">
              <div className="relative w-80">
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
                  <span className="font-medium text-gray-800">{filteredProducts.length}</span>{" "}
                  products found
                </p>
                <div className="h-5 w-px bg-gray-200" />
                <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
                  <SelectTrigger className="w-[180px] border-gray-200 bg-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_asc">Price: Low → High</SelectItem>
                    <SelectItem value="price_desc">Price: High → Low</SelectItem>
                    <SelectItem value="name_asc">Name: A → Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {filters.company && (
                  <FilterTag
                    label={`Brand: ${filters.company}`}
                    onRemove={() => setFilters((prev) => ({ ...prev, company: "" }))}
                  />
                )}
                {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
                  <FilterTag
                    label={`₹${filters.minPrice} – ₹${filters.maxPrice}`}
                    onRemove={() =>
                      setFilters((prev) => ({ ...prev, minPrice: 0, maxPrice: 10000 }))
                    }
                  />
                )}
                {sortBy !== "price_asc" && (
                  <FilterTag
                    label={`Sort: ${sortBy === "price_desc" ? "High to Low" : "A to Z"}`}
                    onRemove={() => setSortBy("price_asc")}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredProducts.map((product, idx) => (
                      <motion.div
                        key={product._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
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
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = page;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (page <= 3) pageNum = i + 1;
                        else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = page - 2 + i;

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={
                              pageNum === page
                                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                                : "border-emerald-200 hover:bg-emerald-50"
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        Next
                      </Button>
                    </nav>
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

// ========== FilterSidebar – Redesigned ==========
interface FilterSidebarProps {
  companies: Company[];
  filters: { company: string; minPrice: number; maxPrice: number };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
  clearFilters: () => void;
}

function FilterSidebar({
  companies,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  clearFilters,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState({
    brand: true,
    price: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
        >
          Clear all
        </Button>
      </div>

      {/* Brand section */}
      <div className="rounded-xl border border-emerald-100 bg-white">
        <button
          onClick={() => toggleSection("brand")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-gray-800">Brand</span>
          </div>
          {openSections.brand ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {openSections.brand && (
          <div className="border-t border-emerald-50 p-4 pt-2">
            <select
              value={filters.company}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, company: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All brands</option>
              {companies.map((company) => (
                <option key={company._id} value={company.slug}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Price section */}
      <div className="rounded-xl border border-emerald-100 bg-white">
        <button
          onClick={() => toggleSection("price")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-gray-800">Price range</span>
          </div>
          {openSections.price ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {openSections.price && (
          <div className="border-t border-emerald-50 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), filters.maxPrice - 100);
                    setFilters((prev: any) => ({ ...prev, minPrice: val }));
                  }}
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => {
                    const val = Math.max(Number(e.target.value), filters.minPrice + 100);
                    setFilters((prev: any) => ({ ...prev, maxPrice: val }));
                  }}
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                  max={10000}
                />
              </div>
            </div>
            <Slider
              min={0}
              max={10000}
              step={100}
              value={[filters.minPrice, filters.maxPrice]}
              onValueChange={(val: number[]) =>
                setFilters((prev: any) => ({ ...prev, minPrice: val[0], maxPrice: val[1] }))
              }
              className="my-2"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>₹0</span>
              <span>₹2.5k</span>
              <span>₹5k</span>
              <span>₹7.5k</span>
              <span>₹10k+</span>
            </div>
          </div>
        )}
      </div>

      {/* Note: Sorting is now in the top bar for desktop, but keep in mobile sheet? We'll also include it here for completeness */}
      <div className="block md:hidden">
        <div className="rounded-xl border border-emerald-100 bg-white">
          <div className="p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Sort by</label>
            <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
              <SelectTrigger className="w-full border-gray-200 bg-gray-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="name_asc">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== FilterTag component ==========
function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-all hover:bg-emerald-100">
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-emerald-200">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}