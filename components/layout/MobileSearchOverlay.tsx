"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

/* ── MobileSearchOverlay ──
 * Mirrors the backdrop/animate-in/body-scroll-lock pattern used by MobileNav,
 * but slides down from the top and hosts the same SearchBar used on desktop
 * (same /api/search endpoint, same debounce/keyboard/result behavior).
 */
export function MobileSearchOverlay({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-white md:hidden shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: visible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <SearchBar className="flex-1" autoFocus={visible} />
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-bg-cream)] transition-colors shrink-0"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
