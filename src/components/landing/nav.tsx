"use client";

import { ArrowRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// `short` is the label in the island on wider screens; sections without one appear only in the phone menu.
const SECTIONS = [
  { href: "#how", label: "How it works", short: "How it works" },
  { href: "#quality", label: "Quality gate", short: "Quality" },
  { href: "#admins", label: "For admins", short: null },
  { href: "#contact", label: "Contact", short: "Contact" },
];

/**
 * Floating island nav, detached from the top edge. From the sm breakpoint up
 * the section links sit in the island; below it they move into a menu that
 * drops from the island, along with the theme switch and both account links.
 */
export function Nav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = button.current;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false);
    // Widening past the breakpoint shows the inline links; the menu has nothing left to do.
    const wide = window.matchMedia("(min-width: 40rem)");
    const onWide = () => wide.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      wide.removeEventListener("change", onWide);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    // The wrapper spans the page width but takes no taps itself; only the island and an open menu do.
    <div ref={wrapper} className="pointer-events-none fixed inset-x-0 top-5 z-30 flex flex-col items-center px-4">
      <nav
        aria-label="Main"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-hair bg-glass py-1.5 pl-4 pr-1.5 shadow-[var(--paper-shadow)] backdrop-blur-md max-sm:w-full max-sm:justify-between"
      >
        <Link href="/" className="mr-3" aria-label="Verity home">
          <Wordmark className="text-[15px]" />
        </Link>
        <div className="flex items-center gap-1">
          {SECTIONS.filter((s) => s.short).map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground max-sm:hidden"
            >
              {s.short}
            </a>
          ))}
          <ThemeToggle className="max-sm:hidden" />
          <Link
            href={signedIn ? "/chat" : "/login"}
            className="ml-1 rounded-full bg-foreground px-4 py-1.5 text-[13.5px] font-medium text-background transition-transform duration-300 ease-spring active:scale-[0.97]"
          >
            {signedIn ? "Open app" : "Sign in"}
          </Link>
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="relative grid size-8 place-items-center rounded-full text-foreground transition-colors hover:bg-shell pointer-coarse:size-10 sm:hidden"
          >
            <List
              weight="regular"
              className={cn("absolute size-[19px] transition-[opacity,transform] duration-300 ease-spring", open && "rotate-90 scale-50 opacity-0")}
            />
            <X
              weight="regular"
              className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-spring", !open && "-rotate-90 scale-50 opacity-0")}
            />
          </button>
        </div>
      </nav>

      {/* Phones only. Kept mounted so it can animate out; inert while closed so it is skipped by focus and screen readers. */}
      <div
        ref={panel}
        id={menuId}
        inert={!open}
        className={cn(
          "paper mt-2 w-full origin-top rounded-3xl p-2 transition-[opacity,transform] duration-300 ease-spring sm:hidden",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <ul className="flex flex-col">
          {SECTIONS.map((s, i) => (
            <li key={s.href}>
              <a
                href={s.href}
                onClick={close}
                style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3.5 font-serif text-[1.35rem] leading-none transition-[background-color,opacity,transform] duration-300 ease-spring hover:bg-shell",
                  open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                )}
              >
                {s.label}
                <ArrowRight weight="regular" className="size-4 text-faint" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-2 border-t border-hair px-2 pb-1 pt-3">
          {signedIn ? (
            <Link
              href="/chat"
              onClick={close}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-brand text-[14.5px] font-medium text-brand-ink"
            >
              Open your chats
            </Link>
          ) : (
            <>
              <Link
                href="/login?mode=register"
                onClick={close}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-brand text-[14.5px] font-medium text-brand-ink"
              >
                Create an account
              </Link>
              <Link
                href="/login"
                onClick={close}
                className="flex h-11 items-center justify-center rounded-full px-4 text-[14.5px] text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
            </>
          )}
          <ThemeToggle className="size-11" />
        </div>
      </div>
    </div>
  );
}
