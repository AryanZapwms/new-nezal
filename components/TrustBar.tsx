"use client";

import {
  Leaf,
  ShieldCheck,
  FlaskConical,
  Rabbit,
  CalendarCheck,
  Lock,
  Factory,
} from "lucide-react";

const trustFeatures = [
  { icon: Leaf,          label: "Made In India",            sub: "Proudly crafted in India with love and care" },
  { icon: FlaskConical,  label: "Contains Natural Actives",  sub: "Carefully selected natural & active ingredients" },
  { icon: Rabbit,        label: "Cruelty-Free",              sub: "We do not test on animals" },
  { icon: CalendarCheck, label: "Suitable For Daily Use",    sub: "Gentle care for everyday beautiful you" },
  { icon: Factory,       label: "G M P",                     sub: "Certified good manufacturing practises " },
  { icon: Lock,          label: "Secure Payment",            sub: "100% safe & secure checkout" },
];

export function TrustBar() {
  return (
    <div className="border-b border-border bg-muted/30 py-3 md:py-5">
      <div className="container-nezal">
        <section className="px-3 py-5 md:px-4 md:py-8" style={{ backgroundColor: "#fdfaf5" }}>
          <div
            className="mx-auto max-w-6xl rounded-2xl border px-4 py-4 md:px-6 md:py-7"
            style={{ borderColor: "#e2d9c5", backgroundColor: "#fdfaf5" }}
          >
            {/* Heading with decorative line flourishes */}
            <div className="mb-4 md:mb-7 flex items-center justify-center gap-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: "#c8b896" }} />
              <h2
                className="whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-widest"
                style={{ color: "#1e3a28" }}
              >
                Our Trust, Your Confidence
              </h2>
              <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: "#c8b896" }} />
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-3 sm:gap-y-6 lg:grid-cols-6 lg:gap-x-2">
              {trustFeatures.map((feat) => (
                <div key={feat.label} className="flex flex-col items-center gap-1 md:gap-2 px-2 text-center">
                  <div
                    className="flex h-9 w-9 md:h-14 md:w-14 items-center justify-center rounded-full border md:border-2"
                    style={{ borderColor: "#1e3a28" }}
                  >
                    <feat.icon className="h-4 w-4 md:h-6 md:w-6" style={{ color: "#1e3a28" }} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide leading-tight" style={{ color: "#1e3a28" }}>
                    {feat.label}
                  </p>
                  <p className="text-xs leading-snug" style={{ color: "#8a8378" }}>
                    {feat.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}