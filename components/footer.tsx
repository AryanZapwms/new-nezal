// components/footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/config";

export default function Footer() {
  return (
    <footer
      className="w-full"
      style={{ background: "#111111", color: "var(--color-text-footer)" }}
    >
      {/* Top divider */}
      <div className="h-px" style={{ background: "var(--color-border-dark)" }} />

      <div className="container-nezal py-12 lg:py-14">
        {/* 5-column grid matching Figma Image 7 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">

          {/* Col 1 – About-us */}
          <div>
  <h4
    className="text-[14px] font-semibold mb-4"
    style={{ color: "var(--color-text-footer-heading)" }}
  >
    Site Map
  </h4>
  <ul className="space-y-2.5">
    {[
      { label: "The Nezal Story", href: "/about-us#story" },
      { label: "Our Philosophy", href: "/about-us#philosophy" },
      { label: "Our Commitment", href: "/about-us#commitment" },
      { label: "Why customer trust us", href: "/about-us#trust" },
      { label: "Reviews", href: "/reviews" },
      { label: "Blogs", href: "/blog" },
    ].map((item) => (
      <li key={item.label}>
        <Link
          href={item.href}
          className="text-[13px] transition-colors hover:text-white"
          style={{ color: "var(--color-text-footer)" }}
        >
          {item.label}
        </Link>
      </li>
    ))}
  </ul>
</div>

    {/* Col 2 – Product */}
<div>
  <h4
    className="text-[14px] font-semibold mb-4"
    style={{ color: "var(--color-text-footer-heading)" }}
  >
    Product
  </h4>
  <ul className="space-y-2.5">
    {[
      { label: "Shop By Category", href: "/shop" },
      { label: "Shop By Concern", href: "/concerns" },
      { label: "Shop By Ingredient", href: "/ingredients" },
      { label: "Nezal Rituals", href: "/rituals" },
      { label: "Gift kits", href: "/collections/gift-kits" },
    ].map((item) => (
      <li key={item.label}>
        <Link
          href={item.href}
          className="text-[13px] transition-colors hover:text-white"
          style={{ color: "var(--color-text-footer)" }}
        >
          {item.label}
        </Link>
      </li>
    ))}
  </ul>
</div>

     

           {/* Col 3 – More Details */}
          <div>
            <h4
              className="text-[14px] font-semibold mb-4"
              style={{ color: "var(--color-text-footer-heading)" }}
            >
             Policies
            </h4>
{/* Policies */}
<ul className="space-y-2 mt-5">
  {[
    { label: "Terms of Service", href: "/termsofservice" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Orders & Returns Policy", href: "/orders-returns" },
    { label: "Shipping Policy", href: "/shipping-policy" },
  ].map((item) => (
    <li key={item.label}>
      <Link
        href={item.href}
        className="text-[13px] transition-colors hover:text-white"
        style={{ color: "var(--color-text-footer)" }}
      >
        {item.label}
      </Link>
    </li>
  ))}
</ul>
          </div>

          {/* Col 4 – Connect */}
          <div>
            <h4
              className="text-[14px] font-semibold mb-4"
              style={{ color: "var(--color-text-footer-heading)" }}
            >
              Connect
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={`mailto:info@nezalherbocare.com`}
                  className="text-[13px] transition-colors hover:text-white"
                  style={{ color: "var(--color-text-footer)" }}
                >
                  Email: info@nezalherbocare.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+912229659955"
                  className="text-[13px] transition-colors hover:text-white"
                  style={{ color: "var(--color-text-footer)" }}
                >
                  Mobile: +91-7710076400
                </a>
              </li>
              
            </ul>

            {/* Social icons */}
            <div className="flex gap-3 mt-5">
              <a
                href={BRAND.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-brand-primary)]"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692V11.07h3.128V8.414c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.315h3.587l-.467 3.636h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                </svg>
              </a>
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-brand-primary)]"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm-4 1.25a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@nezalherbocare"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-brand-primary)]"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a2.965 2.965 0 0 0-2.087-2.1C19.548 3.5 12 3.5 12 3.5s-7.548 0-9.411.586a2.965 2.965 0 0 0-2.087 2.1A31.42 31.42 0 0 0 0 12a31.42 31.42 0 0 0 .502 5.814 2.965 2.965 0 0 0 2.087 2.1C4.452 20.5 12 20.5 12 20.5s7.548 0 9.411-.586a2.965 2.965 0 0 0 2.087-2.1A31.42 31.42 0 0 0 24 12a31.42 31.42 0 0 0-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/91${BRAND.whatsapp.primary}`}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="WhatsApp"
  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--color-brand-primary)]"
  style={{ background: "rgba(255,255,255,0.1)" }}
>
  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.55-3.7 8.25-8.25 8.25a8.24 8.24 0 0 1-4.19-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.55 3.7-8.24 8.24-8.24Zm-4.42 4.4c-.15 0-.4.06-.6.28-.21.23-.8.78-.8 1.9s.82 2.2.93 2.36c.11.15 1.6 2.55 3.96 3.48 1.96.77 2.36.62 2.78.58.42-.04 1.36-.55 1.55-1.09.19-.53.19-.98.13-1.08-.06-.1-.21-.15-.44-.27-.23-.11-1.36-.67-1.57-.75-.21-.08-.36-.11-.51.11-.15.23-.59.75-.72.9-.13.15-.27.17-.5.06-.23-.11-.96-.36-1.83-1.14-.68-.6-1.13-1.35-1.27-1.58-.13-.23-.01-.35.1-.47.11-.11.23-.27.35-.4.11-.14.15-.23.23-.38.08-.15.04-.29-.02-.4-.06-.11-.51-1.26-.71-1.72-.18-.44-.37-.38-.51-.39-.13-.01-.28-.01-.43-.01Z" />
  </svg>
</a>

            </div>
          </div>

          {/* Col 5 – Contact-us */}
          <div>
            <h4
              className="text-[14px] font-semibold mb-4"
              style={{ color: "var(--color-text-footer-heading)" }}
            >
              Contact-us
            </h4>
            <address
              className="not-italic text-[13px] leading-relaxed"
              style={{ color: "var(--color-text-footer)" }}
            >
              Nezal Herbocare Pvt. Ltd.<br />
              S-28, Whispering Plams<br />
              Shopping Complex,<br />
              Lokhandwala Township, Akurli Road.<br />
              Kandivali (E), Mumbai<br />
              Maharashtra India, 400101
            </address>

         
          </div>
        </div>

        {/* Bottom divider + copyright */}
        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "var(--color-border-dark)" }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/nezallogo.jpg"
              alt={BRAND.name}
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              &copy; {new Date().getFullYear()} {BRAND.name} Herbocare Pvt. Ltd. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            
            <span>·</span>
            <span>Made in India</span>
            <span>·</span>
          
          </div>
        </div>
      </div>
    </footer>
  );
}