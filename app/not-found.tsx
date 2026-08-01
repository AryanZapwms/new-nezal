"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const query = q.trim();

    if (query.length > 0) {
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      router.push("/shop");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 flex items-center justify-center p-6">
      {/* Background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -left-20 -top-36 h-[520px] w-[520px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #F7EDD2, transparent 40%)",
          }}
        />

        <div
          className="absolute -right-36 -bottom-28 h-[420px] w-[420px] rounded-full blur-2xl opacity-20 animate-pulse"
          style={{
            background:
              "radial-gradient(circle at 70% 70%, #B18D0C33, transparent 40%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* LEFT SIDE */}
            <section className="flex flex-col justify-center gap-6 p-8 sm:p-10 lg:p-14">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md">
                  <Image
                    src="/nezallogo.jpg"
                    alt="Nezal"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    Nezal
                  </p>

                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Premium Skincare
                  </p>
                </div>
              </div>

              {/* 404 */}
              <div>
                <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
                  404
                </h1>

                <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-300">
                  Sorry — we couldn’t find the page you were looking for. It may
                  have been moved, renamed, or might never have existed.
                </p>

                <p className="mt-3 max-w-xl text-neutral-500 dark:text-neutral-400">
                  Don’t worry — we’ll get you back to glowing skin in seconds.
                </p>
              </div>

              {/* Search */}
              <form
                onSubmit={handleSubmit}
                className="mt-2 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
                role="search"
                aria-label="Search products"
              >
                <label htmlFor="site-search" className="sr-only">
                  Search products
                </label>

                <input
                  id="site-search"
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search serums, peels, cleansers..."
                  className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-neutral-900 dark:text-neutral-100 outline-none transition focus:ring-2 focus:ring-[#B18D0C66]"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#3e8b1b] to-[#39e817] px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
                >
                  Search
                </button>
              </form>

              {/* Buttons */}
              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Home
                </Link>

                <Link
                  href="/shop"
                  className="rounded-lg bg-[#047906] px-4 py-2 font-medium text-white hover:opacity-95 transition"
                >
                  Browse Shop
                </Link>

                <Link
                  href="/contact-us"
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Contact Us
                </Link>

                <a
                  href="mailto:info@nezalherbocare.com?subject=Broken%20link%20on%20site%20404"
                  className="px-4 py-2 text-sm text-neutral-600 hover:underline dark:text-neutral-400"
                >
                  Report this page
                </a>
              </div>

              {/* Tip */}
              <p className="pt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Pro tip: If you were sent here from a broken link, try searching
                for the product name or explore our{" "}
                <Link href="/shop" className="underline">
                  shop
                </Link>
                .
              </p>
            </section>

            {/* RIGHT SIDE */}
            <aside className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6 sm:p-8 lg:p-12">
              <div className="w-full max-w-md">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-inner">
                  <div className="relative bg-gradient-to-br from-white to-[#F7F1E5]/40 dark:from-neutral-900 dark:to-neutral-800 p-6">
                    {/* Floating logo card */}
                    <div className="absolute left-6 -top-8 flex h-24 w-24 rotate-6 items-center justify-center rounded-2xl bg-white dark:bg-neutral-900 shadow-lg">
                      <div className="relative h-14 w-14">
                        <Image
                          src="/nezallogo.jpg"
                          alt="Nezal logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="pt-12">
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Discover our bestsellers
                      </h3>

                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                        Professional-grade peels and skincare carefully
                        formulated for visible results.
                      </p>

                      {/* Products */}
                      {/* <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                          <div className="flex h-20 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
                            Product Image
                          </div>

                          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            Vitamin C Serum
                          </p>

                          <p className="text-xs text-neutral-500">₹899</p>
                        </div>

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                          <div className="flex h-20 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
                            Product Image
                          </div>

                          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            Gentle Peel Kit
                          </p>

                          <p className="text-xs text-neutral-500">₹1,499</p>
                        </div>
                      </div> */}

                      <div className="mt-5">
                        <Link
                          href="/shop"
                          className="inline-block rounded-lg border border-[#11bd19] px-4 py-2 text-[#11bd19] transition hover:bg-[#B18D0C] hover:text-white"
                        >
                          Explore products
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-neutral-100 dark:bg-neutral-900 px-6 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                    Trusted by professionals • Cruelty-free • Made in India
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}