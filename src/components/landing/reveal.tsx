"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fade-and-rise as the block enters the viewport. IntersectionObserver, not a
 * scroll listener: no work per scrolled pixel. The state lives in a data
 * attribute rather than React state, so revealing never re-renders.
 * Content is visible without JS (it is only hidden once the observer runs),
 * and reduced-motion users get it at once via the global media query.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // Only hide what is still below the fold; anything already visible stays put.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.dataset.reveal = "hidden";
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        obs.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "data-[reveal=hidden]:translate-y-10 data-[reveal=hidden]:opacity-0 data-[reveal=hidden]:blur-[6px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
