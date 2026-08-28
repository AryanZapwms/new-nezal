// components/sticky-header-stack.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PromoBar } from "@/components/promo-bar";
import { Header } from "@/components/header";

/* ─── Sticky Header Stack ───────────────────────────────────────────────
 *
 * Wraps PromoBar + Header as a single sticky unit so they always stick or
 * scroll together — no separate top-offset math to keep in sync between
 * them.
 *
 * Home page, mobile only: the hero carousel sits directly below this stack
 * and is short enough that pinning immediately would tuck its heading
 * behind the stack. Kept in normal flow until the hero has fully scrolled
 * past the stack's live height, then pinned like every other page.
 *
 * A ResizeObserver keeps --sticky-header-stack-height in sync with the
 * stack's actual rendered height (promo bar shown/dismissed/rotating,
 * header height changes, viewport resize) so any page content can offset
 * itself against it without a hardcoded, driftable number.
 * ────────────────────────────────────────────────────────────────────── */

export function StickyHeaderStack() {
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (pathname !== "/") { setPinned(true); return; }

    const hero = document.getElementById("home-hero");
    if (!hero) { setPinned(true); return; } // fail safe: same as current behavior if hero isn't found

    const mq = window.matchMedia("(min-width: 768px)");
    let onScroll: (() => void) | null = null;

    const apply = () => {
      if (onScroll) { window.removeEventListener("scroll", onScroll); onScroll = null; }
      if (mq.matches) { setPinned(true); return; } // desktop keeps today's always-sticky behavior

      onScroll = () => {
        const stackHeight = wrapperRef.current?.getBoundingClientRect().height || 0;
        setPinned(hero.getBoundingClientRect().bottom <= stackHeight);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    };

    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      if (onScroll) window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, [pathname]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const setVar = (height: number) => {
      document.documentElement.style.setProperty("--sticky-header-stack-height", `${height}px`);
    };

    setVar(el.getBoundingClientRect().height);

    const observer = new ResizeObserver(([entry]) => setVar(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className={`${pinned ? "sticky" : "relative"} top-0 z-50 w-full`}>
      <PromoBar />
      <Header />
    </div>
  );
}
