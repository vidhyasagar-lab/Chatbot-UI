"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// The theme lives on <html class="dark">, set before paint by the layout script.
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => true);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("verity-theme", next ? "dark" : "light");
    } catch {
      // private mode: the choice just won't persist
    }
  };

  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "grid size-8 place-items-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-300 ease-spring hover:bg-shell hover:text-foreground active:scale-95",
        className,
      )}
    >
      <Icon weight="regular" className="size-[18px]" />
    </button>
  );
}
