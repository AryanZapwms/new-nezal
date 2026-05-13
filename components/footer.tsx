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
          <div className="lg:col-span-1">
            <h4
              className="text-[14px] font-semibold mb-4 text-center"
              style={{ color: "var(--color-text-footer-heading)" }}
            >
              About-us
            </h4>
            <p
              className="text-[13px] leading-relaxed text-center"
              style={{ color: "var(--color-text-footer)" }}
            >
              Nezal.com offers 100% natural products, such as shea butter, cocoa
              butter, aloe vera, olive oil, pure milk, turmeric, aromatherapy
              oils, and natural herbal scrubs.
            </p>
          </div>

          {/* Col 2 – Categories */}
          <div>
            <h4
              className="text-[14px] font-semibold mb-4"
              style={{ color: "var(--color-text-footer-heading)" }}
            >
              Categories
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Soaps", href: "/shop?category=soaps" },
                { label: "Body Care", href: "/shop?category=body-care" },
                { label: "Face Care", href: "/shop?category=face-care" },
                { label: "Hair Care", href: "/shop?category=hair-care" },
                { label: "Intimate hygiene", href: "/shop?category=intimate-hygiene" },
                { label: "Handwash", href: "/shop?category=handwash" },
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
              More-Details
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "About-us", href: "/about-us" },
                { label: "Blog", href: "/blog" },
                { label: "Review", href: "/reviews" },
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
                  href={`mailto:info@Nezal.com`}
                  className="text-[13px] transition-colors hover:text-white"
                  style={{ color: "var(--color-text-footer)" }}
                >
                  Email: info@Nezal.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+912229659955"
                  className="text-[13px] transition-colors hover:text-white"
                  style={{ color: "var(--color-text-footer)" }}
                >
                  Tel:+912229659955
                </a>
              </li>
              <li>
                <a
                  href={`tel:+${BRAND.whatsapp.primary}`}
                  className="text-[13px] transition-colors hover:text-white"
                  style={{ color: "var(--color-text-footer)" }}
                >
                  Mobile:+91{BRAND.whatsapp.primary}
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
              Healthcare Medical Center<br />
              S-55, whispering plans,<br />
              shopping Center,<br />
              lokhandwala, akurli road.<br />
              kandiwali (E), Mumbai<br />
              Maharashtra India, 400101
            </address>

            {/* Policies */}
            <ul className="space-y-2 mt-5">
              {[
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Refund Policy", href: "/refund-policy" },
                { label: "Terms of Service", href: "/termsofservice" },
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
        </div>

        {/* Bottom divider + copyright */}
        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "var(--color-border-dark)" }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/companylogo.png"
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
            <span>100% Natural</span>
            <span>·</span>
            <span>Made in India</span>
            <span>·</span>
            <span>USFDA Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
}