// components/why-choose.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
// Keep all local image imports unchanged
import bestPrice from "./assets/bestprice.png";
import fastDelivery from "./assets/fastdelivery.png";
import quickOrder from "./assets/quickorders.png";
import rupayImage from "./assets/rupay.png";
import gpayImage from "./assets/gpay.png";
import phonePeImage from "./assets/phonepe.png";
import upiImage from "./assets/upi.png";
import mastercardImage from "./assets/mastercard.png";
import amexImage from "./assets/amex.png";
import onlineBankingImage from "./assets/onlinebanking.png";
import varifiedIcon from "./assets/verified-icon.png";

interface Company {
  _id: string;
  name: string;
  slug: string;
}

type FeatureProps = {
  title: string;
  desc: string;
  image: StaticImageData;
};

// ── Feature card matching Figma Image 6 ──────────────────────────
// White card, gold-tinted circle icon, title, description
function Feature({ title, desc, image }: FeatureProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="flex flex-col items-center text-center p-6 rounded-2xl border transition-shadow hover:shadow-md"
      style={{
        background: "white",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Gold-tinted icon circle — matches Figma */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "#FFF5E0", border: "1px solid #F5C84230" }}
      >
        <Image
          src={image}
          alt={title}
          width={38}
          height={38}
          onLoad={() => setLoaded(true)}
          className={`object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      <h3
        className="text-[16px] font-semibold mb-2"
        style={{ color: "var(--color-text-heading)" }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "var(--color-text-body)" }}
      >
        {desc}
      </p>
    </div>
  );
}

// ── Payment logo ──────────────────────────────────────────────────
function PaymentLogo({ img, index }: { img: StaticImageData; index: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="flex items-center justify-center p-2 rounded-lg border h-12 relative overflow-hidden"
      style={{ background: "white", borderColor: "var(--color-border)" }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-brand-primary)" }}
          />
        </div>
      )}
      <Image
        src={img}
        alt={`payment-${index}`}
        width={72}
        height={28}
        className={`object-contain max-h-6 hover:scale-105 transition-transform ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} style={{ background: "#e5e5e5" }} />;
}

// ── WhyChoose component ───────────────────────────────────────────
export default function WhyChoose() {
  const pathname = usePathname();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pathParts = pathname?.split("/") || [];
  const isOnShopPage = pathParts[1] === "shop" && pathParts[2];
  const companySlug = pathParts[2];

  // ── Logic unchanged ───────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    if (isOnShopPage && companySlug) {
      fetch("/api/companies")
        .then((res) => res.json())
        .then((data) => {
          const current = data.find((c: Company) => c.slug === companySlug);
          if (current) setCurrentCompany(current);
        })
        .catch((err) => console.error("Error fetching companies:", err))
        .finally(() => setIsLoading(false));
    } else {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [isOnShopPage, companySlug]);

  const displayName = currentCompany?.name || "Nezal";

  const paymentLogos = [
    rupayImage, gpayImage, phonePeImage, upiImage,
    mastercardImage, amexImage, onlineBankingImage,
  ];

  if (isLoading) {
    return (
      <div className="py-12 px-4">
        <div className="container-nezal mx-auto">
          <div
            className="rounded-2xl p-6 md:p-8 space-y-5"
            style={{ background: "var(--color-bg-cream)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="container-nezal mx-auto">
        <div
          className="rounded-2xl p-5 md:p-8 space-y-5"
          style={{ background: "var(--color-bg-cream)", border: "1px solid var(--color-border)" }}
        >
          {/* ── 3 Feature cards (Image 6) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Feature
              image={quickOrder}
              title="Quick Order"
              desc="Orders with Multiple SKUs Can be entered manually, or imported into the Quick order form"
            />
            <Feature
              image={fastDelivery}
              title="Fast Delivery"
              desc="Extra fast Delivery, let seller offer buyers a much faster delivery when you buy a product"
            />
            <Feature
              image={bestPrice}
              title="Best Price"
              desc="the lowest prices that a buyer can buy something for great purchase"
            />
          </div>

          {/* ── Bottom: payments + contact ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payment protection card */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "white", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Image
                    src={varifiedIcon}
                    alt="verified"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--color-brand-primary)" }}
                    >
                      100% Payment protection
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                      Easy Return Policy
                    </p>
                  </div>
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                  {displayName} accepts
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {paymentLogos.map((img, i) => (
                  <PaymentLogo key={i} img={img} index={i} />
                ))}
              </div>
            </div>

            {/* Contact card */}
            <div
              className="rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-4"
              style={{ background: "white", borderColor: "var(--color-border)" }}
            >
              <h3
                className="text-[17px] font-bold"
                style={{ color: "var(--color-text-heading)" }}
              >
                Have Queries or Concerns?
              </h3>
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                Our team is here to help you 7 days a week
              </p>
              <Link
  href="/contact-us" // change this to your actual contact page route
  className="inline-flex items-center justify-center h-10 px-7 rounded-full text-[14px] font-semibold text-white transition-colors"
  style={{ background: "var(--color-brand-primary)" }}
  onMouseOver={(e) =>
    (e.currentTarget.style.background = "var(--color-brand-primary-dark)")
  }
  onMouseOut={(e) =>
    (e.currentTarget.style.background = "var(--color-brand-primary)")
  }
>
  Contact Us
</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}